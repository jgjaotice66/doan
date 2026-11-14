<?php

namespace App\Services;

use App\Http\Resources\ProductResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Queries\ProductFilter;
use App\Support\ChatMessage;
use App\Support\ShopSettings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Chatbot theo kịch bản (không dùng AI): nhận ra ý định bằng từ khoá, trả lời bằng dữ liệu thật của shop.
 *
 * Thứ tự ưu tiên: đơn hàng → đổi trả → thanh toán → phí ship → hotline → tìm sản phẩm → chào hỏi → không hiểu.
 * Không hiểu thì nói thẳng và gợi ý hotline, không đoán bừa.
 */
class ChatbotService
{
    /** Số sản phẩm tối đa hiện trong một tin trả lời. */
    public const MAX_PRODUCTS = 4;

    public const SUGGESTIONS = [
        'Gundam dưới 1 triệu',
        'Quà cho bé 6 tuổi',
        'Đơn hàng của tôi',
        'Chính sách đổi trả',
        'Phí ship bao nhiêu?',
        'Gọi hotline',
    ];

    /** @var array<string, list<string>> */
    private const INTENTS = [
        'orders' => ['don hang', 'don cua', 'ma don', 'tra don', 'kiem tra don', 'theo doi don', 'don minh', 'don toi',
            'don em', 'toi dau', 'den dau', 'giao chua', 'da giao', 'bao gio giao', 'khi nao giao', 'nhan duoc hang chua', 'order'],
        'returns' => ['doi tra', 'tra hang', 'tra lai', 'doi hang', 'hoan tien', 'hoan hang', 'khong ung', 'bi loi',
            'bi hong', 'hu hong', 'bi vo', 'bao hanh'],
        'payment' => ['thanh toan', 'chuyen khoan', 'cod', 'qr', 'tra tien', 'tien mat', 'quet ma', 'so tai khoan', 'stk'],
        'shipping' => ['ship', 'phi giao', 'phi van chuyen', 'van chuyen', 'giao hang', 'tien giao', 'freeship', 'giao mat',
            'giao trong', 'bao lau'],
        'hotline' => ['hotline', 'so dien thoai', 'sdt', 'lien he', 'goi dien', 'tu van', 'nhan vien', 'zalo', 'gap nguoi'],
    ];

    /** Câu có những từ này là đang muốn xem hàng, kể cả khi không nêu tên/giá cụ thể. */
    private const PRODUCT_WORDS = ['mua', 'tim', 'san pham', 'do choi', 'goi y', 'qua', 'tang', 'xem', 'co ban',
        'hang moi', 'ban chay', 'noi bat', 're nhat', 'dat nhat', 'mo hinh'];

    private const GREETINGS = ['xin chao', 'chao', 'hello', 'hi', 'hey', 'alo', 'shop oi'];

    private const THANKS = ['cam on', 'thank', 'thanks', 'tks', 'ok', 'oke'];

    /** Tên gọi khác của danh mục (theo slug) ngoài tên/slug có sẵn. */
    private const CATEGORY_ALIASES = [
        'gundam' => ['gunpla', 'gundam'],
        'board-game' => ['boardgame', 'tro choi ban', 'board game'],
        'mo-hinh-xe' => ['xe mo hinh', 'mo hinh xe', 'o to', 'oto'],
        'anime-figure' => ['anime'],
        'funko-pop' => ['funko'],
        'phu-kien' => ['phu kien', 'dung cu'],
    ];

    /**
     * @param  array<string, mixed>  $context  bộ lọc của lần tìm trước (để hiểu "còn cái rẻ hơn không?")
     * @return array<string, mixed>
     */
    public function reply(string $message, array $context, ?User $user): array
    {
        $chat = new ChatMessage($message);

        foreach (self::INTENTS as $intent => $phrases) {
            if ($chat->has($phrases) || ($intent === 'orders' && $chat->orderCode())) {
                return match ($intent) {
                    'orders' => $this->orders(new ChatMessage($message), $user),
                    'returns' => $this->returns(),
                    'payment' => $this->payment(),
                    'shipping' => $this->shipping(),
                    'hotline' => $this->hotline(),
                };
            }
        }

        return $this->products($chat, $context) ?? $this->smallTalk($chat);
    }

    // ── Sản phẩm ──────────────────────────────────────────────────

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>|null null khi câu không giống tìm hàng và cũng không tìm ra gì
     */
    private function products(ChatMessage $chat, array $context): ?array
    {
        $filters = $this->filtersFrom($chat, $context);
        $wantsProducts = $chat->has(self::PRODUCT_WORDS) || $filters['follow_up'];
        unset($filters['follow_up']);

        $hasFilters = collect($filters)->except(['sort', 'q'])->filter(fn ($v) => $v !== null)->isNotEmpty();
        if (! $hasFilters && $filters['q'] === null && ! $wantsProducts) {
            return null;
        }

        // Hỏi chung chung ("gợi ý quà tặng") → món bán chạy.
        if (! $hasFilters && $filters['q'] === null) {
            $filters['sort'] ??= 'best_selling';
        }

        $page = $this->search($filters)->paginate(self::MAX_PRODUCTS);
        $asked = $filters;

        // Từ khoá không khớp tên nào → nới dần: bỏ danh mục ("figure one piece" có thể nằm ở Anime Figure),
        // rồi bỏ từ khoá nếu vẫn còn điều kiện khác (giá, tuổi…) hoặc khách đang hỏi xem hàng.
        if ($page->isEmpty() && $filters['q'] !== null) {
            $relaxations = array_filter([
                $filters['category'] !== null ? ['category' => null] : null,
                $hasFilters || $wantsProducts ? ['q' => null] : null,
            ]);
            foreach ($relaxations as $relaxation) {
                $candidate = array_replace($filters, $relaxation);
                if ($candidate['q'] === null && ! $hasFilters) {
                    $candidate['sort'] ??= 'best_selling';
                }
                $candidatePage = $this->search($candidate)->paginate(self::MAX_PRODUCTS);
                if ($candidatePage->isNotEmpty()) {
                    [$filters, $page] = [$candidate, $candidatePage];
                    break;
                }
            }
        }

        $products = collect($page->items());

        // Chỉ có từ lạ (không danh mục/giá/tuổi) mà tìm không ra → coi như không hiểu.
        if ($products->isEmpty() && ! $hasFilters && ! $wantsProducts) {
            return null;
        }

        $description = $this->describe($filters);

        if ($products->isEmpty()) {
            return $this->answer('products', "Hiện chưa có sản phẩm nào{$description}. Bạn thử nới khoảng giá hoặc đổi từ khoá xem sao nhé.",
                context: $filters);
        }

        $total = $page->total();
        $prices = $products->map(fn (Product $p) => $p->final_price);
        $intro = $asked === $filters
            ? "Mình tìm được {$total} sản phẩm{$description}"
            : "Mình không thấy món nào khớp “{$asked['q']}”, nhưng có {$total} sản phẩm{$description}";
        $text = $total > $products->count()
            ? "{$intro}. Đây là {$products->count()} món {$this->sortLabel($filters['sort'])}:"
            : "{$intro}:";

        return $this->answer('products', $text,
            products: ProductResource::collection($products)->resolve(),
            link: ['label' => $total > $products->count() ? "Xem tất cả {$total} sản phẩm" : 'Mở trang sản phẩm', 'to' => $this->listUrl($filters)],
            context: $filters + ['min_shown' => $prices->min(), 'max_shown' => $prices->max()],
            suggestions: ['Còn cái nào rẻ hơn không?', 'Có cái nào xịn hơn không?', 'Phí ship bao nhiêu?'],
        );
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array{q: ?string, category: ?string, brand: ?string, min_age: ?int, price_min: ?int, price_max: ?int, sort: ?string, follow_up: bool}
     */
    private function filtersFrom(ChatMessage $chat, array $context): array
    {
        $age = $chat->age();
        $price = $chat->priceRange();
        $category = $chat->takeAlias($this->categoryAliases());
        $brand = $chat->takeAlias($this->brandAliases());
        $sort = match (true) {
            $chat->has(['re nhat', 'gia re', 're re', 're hon', 'binh dan']) => 'price_asc',
            $chat->has(['dat nhat', 'mac nhat', 'xin nhat', 'cao cap', 'xin hon', 'dat hon', 'cao hon']) => 'price_desc',
            $chat->has(['ban chay', 'dang hot', 'hot nhat', 'pho bien', 'nhieu nguoi mua']) => 'best_selling',
            $chat->has(['moi nhat', 'moi ve', 'hang moi']) => 'newest',
            default => null,
        };

        $filters = [
            'q' => $chat->keywords(self::wordsOf([...self::PRODUCT_WORDS, ...self::GREETINGS, ...self::THANKS])) ?: null,
            'category' => $category,
            'brand' => $brand,
            'min_age' => $age,
            'price_min' => $price['min'],
            'price_max' => $price['max'],
            'sort' => $sort,
            'follow_up' => false,
        ];

        // "Còn cái rẻ hơn / xịn hơn không?" mà không nêu gì mới → giữ bộ lọc lần trước, dịch khoảng giá.
        $cheaper = $chat->has(['re hon', 'mem hon']) && isset($context['min_shown']);
        $pricier = $chat->has(['xin hon', 'dat hon', 'cao hon', 'tot hon']) && isset($context['max_shown']);
        $nothingNew = $category === null && $brand === null && $age === null && $filters['q'] === null;

        if (($cheaper || $pricier) && $nothingNew && $price['min'] === null && $price['max'] === null) {
            $filters = [
                'q' => $context['q'] ?? null,
                'category' => $context['category'] ?? null,
                'brand' => $context['brand'] ?? null,
                'min_age' => $context['min_age'] ?? null,
                'price_min' => $cheaper ? ($context['price_min'] ?? null) : (int) $context['max_shown'] + 1,
                'price_max' => $cheaper ? (int) $context['min_shown'] - 1 : ($context['price_max'] ?? null),
                'sort' => $cheaper ? 'price_asc' : 'price_desc',
                'follow_up' => true,
            ];
        }

        return $filters;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Product>
     */
    private function search(array $filters): Builder
    {
        $query = Product::query()
            ->active()
            ->with(['brand', 'images' => fn ($q) => $q->limit(2)])
            ->when($filters['min_age'] !== null, fn (Builder $q) => $q->where('min_age', '<=', $filters['min_age']));

        return ProductFilter::apply($query, [
            'q' => $filters['q'],
            'category' => $filters['category'],
            'brand' => $filters['brand'] ? [$filters['brand']] : null,
            'price_min' => $filters['price_min'],
            'price_max' => $filters['price_max'],
            'sort' => $filters['sort'] ?? 'newest',
        ]);
    }

    /**
     * Link "Xem tất cả" sang trang danh sách (cùng tên tham số với ProductListPage).
     * Độ tuổi không đưa vào: trang danh sách lọc đúng nhóm tuổi, còn bot lọc "phù hợp với tuổi".
     *
     * @param  array<string, mixed>  $filters
     */
    private function listUrl(array $filters): string
    {
        $query = http_build_query(array_filter([
            'q' => $filters['q'],
            'category' => $filters['category'],
            'brand' => $filters['brand'],
            'price_min' => $filters['price_min'],
            'price_max' => $filters['price_max'],
            'sort' => $filters['sort'] === 'newest' ? null : $filters['sort'],
        ], fn ($value) => $value !== null), '', '&', PHP_QUERY_RFC3986);

        return '/products'.($query !== '' ? "?{$query}" : '');
    }

    /**
     * " thuộc Gundam / Gunpla, giá dưới 800.000đ" — mô tả lại bộ lọc bot đã hiểu.
     *
     * @param  array<string, mixed>  $filters
     */
    private function describe(array $filters): string
    {
        $parts = array_filter([
            $filters['q'] ? "khớp “{$filters['q']}”" : null,
            $filters['category'] ? 'thuộc '.Category::where('slug', $filters['category'])->value('name') : null,
            $filters['brand'] ? 'của '.Brand::where('slug', $filters['brand'])->value('name') : null,
            $filters['min_age'] !== null ? "hợp với bé {$filters['min_age']} tuổi" : null,
            match (true) {
                $filters['price_min'] !== null && $filters['price_max'] !== null => 'giá từ '.self::money($filters['price_min']).' đến '.self::money($filters['price_max']),
                // 499.999 (sau "rẻ hơn") đọc thành "dưới 500.000đ".
                $filters['price_max'] !== null => 'giá dưới '.self::money($filters['price_max'] % 1000 === 999 ? $filters['price_max'] + 1 : $filters['price_max']),
                $filters['price_min'] !== null => 'giá từ '.self::money($filters['price_min']),
                default => null,
            },
        ]);

        return $parts ? ' '.implode(', ', $parts) : '';
    }

    private function sortLabel(?string $sort): string
    {
        return match ($sort) {
            'price_asc' => 'rẻ nhất',
            'price_desc' => 'giá cao nhất',
            'best_selling' => 'bán chạy nhất',
            default => 'mới nhất',
        };
    }

    /**
     * Tên/slug danh mục (bỏ dấu) => slug. "Gundam / Gunpla" tách thành "gundam" và "gunpla".
     *
     * @return array<string, string>
     */
    private function categoryAliases(): array
    {
        $aliases = [];
        foreach (Category::query()->get(['name', 'slug']) as $category) {
            $names = [$category->name, str_replace('-', ' ', $category->slug), ...explode('/', $category->name)];
            foreach ([...$names, ...(self::CATEGORY_ALIASES[$category->slug] ?? [])] as $name) {
                $aliases[(new ChatMessage($name))->text] = $category->slug;
            }
        }

        return $aliases;
    }

    /**
     * @return array<string, string>
     */
    private function brandAliases(): array
    {
        return Brand::query()->get(['name', 'slug'])
            ->mapWithKeys(fn (Brand $brand) => [(new ChatMessage($brand->name))->text => $brand->slug])
            ->all();
    }

    // ── Đơn hàng ──────────────────────────────────────────────────

    /**
     * @return array<string, mixed>
     */
    private function orders(ChatMessage $chat, ?User $user): array
    {
        if (! $user) {
            return $this->answer('orders', 'Bạn đăng nhập để mình tra đơn hàng giúp nhé.',
                link: ['label' => 'Đăng nhập', 'to' => '/login']);
        }

        $orders = $user->orders()->withSum('items as item_count', 'quantity');
        $code = $chat->orderCode();

        if ($code) {
            $order = $orders->where('code', $code)->first();
            if (! $order) {
                return $this->answer('orders', "Mình không thấy đơn {$code} trong tài khoản của bạn. Bạn kiểm tra lại mã đơn nhé.",
                    link: ['label' => 'Xem đơn của tôi', 'to' => '/orders']);
            }

            $text = "Đơn {$order->code} đang ở trạng thái: {$order->status->label()}.";
            if ($order->awaitsTransfer()) {
                $text .= ' Shop chưa nhận được tiền chuyển khoản — mã QR có trong trang chi tiết đơn.';
            }

            return $this->answer('orders', $text, orders: [$this->orderCard($order)],
                link: ['label' => 'Xem chi tiết đơn', 'to' => "/orders/{$order->code}"]);
        }

        /** @var Collection<int, Order> $latest */
        $latest = $orders->latest()->orderByDesc('id')->limit(3)->get();

        if ($latest->isEmpty()) {
            return $this->answer('orders', 'Bạn chưa có đơn hàng nào. Mình tìm vài món hay ho cho bạn nhé?',
                suggestions: ['Món bán chạy', 'Gundam dưới 1 triệu', 'Quà cho bé 6 tuổi']);
        }

        return $this->answer('orders', 'Đây là '.$latest->count().' đơn gần nhất của bạn:',
            orders: $latest->map(fn (Order $order) => $this->orderCard($order))->all(),
            link: ['label' => 'Xem tất cả đơn', 'to' => '/orders']);
    }

    /**
     * @return array<string, mixed>
     */
    private function orderCard(Order $order): array
    {
        return [
            'code' => $order->code,
            'status' => ['value' => $order->status->value, 'label' => $order->status->label()],
            'total' => $order->total,
            'item_count' => (int) $order->item_count,
            'created_at' => $order->created_at?->toIso8601String(),
        ];
    }

    // ── Chính sách & liên hệ ─────────────────────────────────────

    /**
     * @return array<string, mixed>
     */
    private function returns(): array
    {
        $days = (int) config('shop.return_days');

        return $this->answer('returns',
            "Bạn được yêu cầu trả hàng trong {$days} ngày kể từ khi đơn hoàn thành. Vào Đơn hàng → chọn đơn → “Yêu cầu trả hàng”, "
            .'chọn sản phẩm, lý do, kèm ảnh/video tình trạng hàng và số tài khoản nhận tiền hoàn. Shop duyệt xong sẽ chuyển khoản hoàn tiền cho bạn.',
            link: ['label' => 'Đơn hàng của tôi', 'to' => '/orders']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payment(): array
    {
        return $this->answer('payment',
            'Shop nhận 2 cách thanh toán: COD (trả tiền mặt khi nhận hàng) và chuyển khoản bằng mã QR. '
            .'Chọn chuyển khoản thì mã QR hiện ngay sau khi đặt, có sẵn số tiền và nội dung là mã đơn; shop xác nhận khi nhận được tiền.');
    }

    /**
     * @return array<string, mixed>
     */
    private function shipping(): array
    {
        $fee = (int) config('shop.shipping_fee');
        $text = $fee > 0 ? 'Phí giao hàng đồng giá '.self::money($fee).' cho mỗi đơn.' : 'Shop đang miễn phí giao hàng cho mọi đơn.';
        $hotline = ShopSettings::hotline();
        if ($hotline) {
            $text .= ' Muốn hỏi thời gian giao tới chỗ bạn thì gọi hotline '.self::phone($hotline).' nhé.';
        }

        return $this->answer('shipping', $text);
    }

    /**
     * @return array<string, mixed>
     */
    private function hotline(): array
    {
        $hotline = ShopSettings::hotline();

        return $hotline
            ? $this->answer('hotline', 'Bạn gọi hotline '.self::phone($hotline).' để gặp nhân viên tư vấn nhé.',
                link: ['label' => 'Gọi '.self::phone($hotline), 'to' => "tel:{$hotline}"])
            : $this->answer('hotline', 'Hiện shop chưa có số hotline. Bạn cứ hỏi mình về sản phẩm, đơn hàng hay chính sách nhé.');
    }

    // ── Chào hỏi & không hiểu ────────────────────────────────────

    /**
     * @return array<string, mixed>
     */
    private function smallTalk(ChatMessage $chat): array
    {
        if ($chat->has(self::THANKS)) {
            return $this->answer('thanks', 'Không có gì ạ! Bạn cần gì cứ hỏi mình nhé.');
        }

        if ($chat->has(self::GREETINGS)) {
            return $this->answer('greeting',
                'Chào bạn! Mình là trợ lý của Toy Store. Mình tìm được đồ chơi theo tên, giá, độ tuổi, tra đơn hàng và trả lời về đổi trả, phí ship, thanh toán.');
        }

        $hotline = ShopSettings::hotline();

        return $this->answer('fallback',
            'Xin lỗi, mình chưa hiểu câu này. Bạn thử hỏi kiểu “Gundam dưới 1 triệu” hoặc chọn một gợi ý bên dưới'
            .($hotline ? ', hay gọi hotline '.self::phone($hotline).' để gặp nhân viên' : '').' nhé.');
    }

    /**
     * Mọi câu trả lời cùng một dạng để frontend hiển thị đơn giản.
     *
     * @param  list<array<string, mixed>>  $products
     * @param  list<array<string, mixed>>  $orders
     * @param  array{label: string, to: string}|null  $link
     * @param  array<string, mixed>|null  $context
     * @param  list<string>|null  $suggestions
     * @return array<string, mixed>
     */
    private function answer(
        string $intent,
        string $text,
        array $products = [],
        array $orders = [],
        ?array $link = null,
        ?array $context = null,
        ?array $suggestions = null,
    ): array {
        return [
            'intent' => $intent,
            'text' => $text,
            'products' => $products,
            'orders' => $orders,
            'link' => $link,
            'context' => $context,
            'suggestions' => $suggestions ?? self::SUGGESTIONS,
        ];
    }

    /**
     * @param  list<string>  $phrases
     * @return list<string>
     */
    private static function wordsOf(array $phrases): array
    {
        return array_values(array_unique(explode(' ', implode(' ', $phrases))));
    }

    private static function money(int $amount): string
    {
        return number_format($amount, 0, ',', '.').'đ';
    }

    /** 0123456789 → "0123 456 789", 19001234 → "1900 1234" (giống formatHotline ở frontend). */
    private static function phone(string $number): string
    {
        return match (true) {
            strlen($number) === 10 => substr($number, 0, 4).' '.substr($number, 4, 3).' '.substr($number, 7),
            Str::startsWith($number, ['1800', '1900']) => substr($number, 0, 4).' '.substr($number, 4),
            default => $number,
        };
    }
}

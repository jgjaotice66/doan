<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\ReturnStatus;
use App\Enums\StockReason;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\User;
use App\Support\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Trả hàng sau khi giao. Mỗi bước khoá dòng (đơn / yêu cầu) rồi mới kiểm tra, để bấm 2 lần
 * hoặc 2 admin cùng xử lý không làm nhập kho / hoàn tiền 2 lần.
 *
 *   pending → approved → received (tuỳ chọn nhập lại kho từng món) → refunded;  pending|approved → rejected
 */
class ReturnService
{
    public const MEDIA_DIR = 'returns';

    public function __construct(private StockService $stock) {}

    /**
     * Khách gửi yêu cầu. Kiểm tra hết quy tắc rồi mới lưu tệp → bị từ chối thì không để lại tệp rác;
     * lưu DB lỗi thì xoá các tệp vừa lưu.
     *
     * @param  array{reason: string, description?: ?string, items: list<array{order_item_id: int, quantity: int}>, bank_name: string, bank_account: string, account_name: string}  $data
     * @param  list<UploadedFile>  $files
     *
     * @throws ValidationException
     */
    public function create(Order $order, User $customer, array $data, array $files): ReturnRequest
    {
        return DB::transaction(function () use ($order, $customer, $data, $files) {
            // Khoá đơn: 2 lần bấm gửi cùng lúc thì lần sau thấy đã có yêu cầu đang mở.
            $locked = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            $this->ensureReturnable($locked, $data['items']);

            $paths = [];
            try {
                $request = $locked->returnRequests()->create([
                    'user_id' => $customer->id,
                    'status' => ReturnStatus::Pending,
                    'reason' => $data['reason'],
                    'description' => filled($data['description'] ?? null) ? trim($data['description']) : null,
                    'bank_name' => trim($data['bank_name']),
                    'bank_account' => $data['bank_account'],
                    'account_name' => mb_strtoupper(trim($data['account_name'])),
                ]);

                foreach ($data['items'] as $item) {
                    $request->items()->create(['order_item_id' => $item['order_item_id'], 'quantity' => $item['quantity']]);
                }

                foreach ($files as $file) {
                    $paths[] = $path = Media::store($file, self::MEDIA_DIR);
                    $request->media()->create([
                        'path' => $path,
                        'type' => str_starts_with((string) $file->getMimeType(), 'video/') ? 'video' : 'image',
                    ]);
                }
            } catch (Throwable $e) {
                array_walk($paths, fn ($path) => Media::delete($path));

                throw $e;
            }

            return $request;
        });
    }

    public function approve(ReturnRequest $request, ?string $note): ReturnRequest
    {
        return $this->transition($request, ReturnStatus::Approved, function (ReturnRequest $locked) use ($note) {
            $locked->admin_note = filled($note) ? trim($note) : $locked->admin_note;
            $locked->reviewed_at = now();
        });
    }

    public function reject(ReturnRequest $request, string $note): ReturnRequest
    {
        return $this->transition($request, ReturnStatus::Rejected, function (ReturnRequest $locked) use ($note) {
            $locked->admin_note = trim($note);
            $locked->reviewed_at ??= now();
        });
    }

    /**
     * Đã nhận hàng khách gửi về. $lines = [{ id: dòng của yêu cầu, restock: bool }]; món restock = true thì nhập lại kho
     * (lý do "Trả hàng"), món hỏng thì không. Dòng không nhắc tới = không nhập kho.
     *
     * @param  list<array{id: int, restock?: bool}>  $lines
     */
    public function receive(ReturnRequest $request, User $actor, array $lines): ReturnRequest
    {
        return $this->transition($request, ReturnStatus::Received, function (ReturnRequest $locked) use ($actor, $lines) {
            $items = $locked->items()->with('orderItem')->get()->keyBy('id');

            foreach ($lines as $index => $line) {
                if (! $items->has($line['id'])) {
                    throw ValidationException::withMessages(["items.{$index}.id" => 'Dòng hàng không thuộc yêu cầu này.']);
                }
            }

            $restockIds = collect($lines)->filter(fn ($line) => (bool) ($line['restock'] ?? false))->pluck('id')->all();
            $toRestock = $items->only($restockIds);

            // Khoá sản phẩm theo id tăng dần (giống lúc đặt hàng) rồi mới cộng kho.
            $products = Product::withTrashed()
                ->whereKey($toRestock->pluck('orderItem.product_id'))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($toRestock as $item) {
                $product = $products->get($item->orderItem->product_id);
                if ($product) {
                    $this->stock->record($product, $item->quantity, StockReason::Return, $locked->order, $actor, "Yêu cầu trả hàng #{$locked->id}");
                }
                $item->update(['restock' => true]);
            }

            $locked->received_at = now();
        });
    }

    /**
     * Ghi nhận đã chuyển tiền hoàn (làm thủ công). Không nhập số tiền → hoàn số gợi ý.
     * Tối đa = tổng đơn − số đã hoàn ở các yêu cầu khác.
     */
    public function refund(ReturnRequest $request, ?int $amount): ReturnRequest
    {
        return $this->transition($request, ReturnStatus::Refunded, function (ReturnRequest $locked) use ($amount) {
            $locked->load(['order', 'items.orderItem']);
            $max = $this->maxRefund($locked);
            $amount ??= $this->suggestedRefund($locked);

            if ($amount < 1 || $amount > $max) {
                throw ValidationException::withMessages([
                    'refund_amount' => 'Số tiền hoàn phải từ 1 ₫ đến '.number_format($max, 0, ',', '.').' ₫.',
                ]);
            }

            $locked->refund_amount = $amount;
            $locked->refunded_at = now();
        });
    }

    /** Số tiền tối đa còn hoàn được cho yêu cầu này. */
    public function maxRefund(ReturnRequest $request): int
    {
        return max(0, $request->order->total - $request->order->refundedByReturns(except: $request->id));
    }

    /** Gợi ý = tiền hàng của các món trả (không gồm phí ship), không vượt mức tối đa. */
    public function suggestedRefund(ReturnRequest $request): int
    {
        return min($request->itemsTotal(), $this->maxRefund($request));
    }

    /**
     * @param  list<array{order_item_id: int, quantity: int}>  $lines
     *
     * @throws ValidationException
     */
    private function ensureReturnable(Order $order, array $lines): void
    {
        if ($order->status !== OrderStatus::Completed) {
            throw ValidationException::withMessages(['order' => 'Chỉ gửi yêu cầu trả hàng cho đơn đã hoàn thành.']);
        }

        if (! $order->withinReturnWindow()) {
            $days = (int) config('shop.return_days');
            throw ValidationException::withMessages(['order' => "Đã quá hạn {$days} ngày kể từ khi nhận hàng, không thể yêu cầu trả hàng."]);
        }

        if ($order->returnRequests()->open()->exists()) {
            throw ValidationException::withMessages(['order' => 'Đơn đang có yêu cầu trả hàng chưa xử lý xong.']);
        }

        $orderItems = $order->items()->get()->keyBy('id');
        $returned = $order->returnedQuantities();
        $errors = [];

        foreach ($lines as $index => $line) {
            $orderItem = $orderItems->get($line['order_item_id']);
            if (! $orderItem) {
                $errors["items.{$index}.order_item_id"] = 'Sản phẩm không thuộc đơn hàng này.';

                continue;
            }

            $left = $orderItem->quantity - ($returned[$orderItem->id] ?? 0);
            if ($line['quantity'] > $left) {
                $errors["items.{$index}.quantity"] = $left > 0
                    ? "“{$orderItem->product_name}” chỉ còn trả được {$left} sản phẩm."
                    : "“{$orderItem->product_name}” đã được trả hết.";
            }
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Khoá yêu cầu, đọc trạng thái mới nhất, kiểm tra luồng → $apply → lưu.
     *
     * @param  callable(ReturnRequest): void  $apply
     */
    private function transition(ReturnRequest $request, ReturnStatus $to, callable $apply): ReturnRequest
    {
        return DB::transaction(function () use ($request, $to, $apply) {
            $locked = ReturnRequest::whereKey($request->id)->lockForUpdate()->firstOrFail();

            if (! $locked->status->canTransitionTo($to)) {
                throw ValidationException::withMessages([
                    'status' => "Không thể chuyển yêu cầu từ “{$locked->status->label()}” sang “{$to->label()}”.",
                ]);
            }

            $apply($locked);
            $locked->status = $to;
            $locked->save();

            $request->setRawAttributes($locked->getAttributes(), true);

            return $request;
        });
    }
}

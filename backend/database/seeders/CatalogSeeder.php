<?php

namespace Database\Seeders;

use App\Enums\StockReason;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    /**
     * @var array<string, string> slug => tên thương hiệu
     */
    private const BRANDS = [
        'bandai' => 'Bandai',
        'lego' => 'LEGO',
        'hasbro' => 'Hasbro',
        'mattel' => 'Mattel',
        'good-smile' => 'Good Smile',
        'funko' => 'Funko',
        'tamiya' => 'Tamiya',
        'hot-toys' => 'Hot Toys',
        'kotobukiya' => 'Kotobukiya',
        'tomica' => 'Tomica',
    ];

    /**
     * Danh mục => danh sách [tên, thương hiệu, giá (VND), độ tuổi tối thiểu].
     *
     * @var array<string, array{name: string, products: list<array{0: string, 1: string, 2: int, 3: int}>}>
     */
    private const CATALOG = [
        'figure' => ['name' => 'Figure', 'products' => [
            ['Iron Man Mark LXXXV 1/6', 'hot-toys', 8900000, 14],
            ['Spider-Man No Way Home 1/6', 'hot-toys', 7500000, 14],
            ['Batman The Dark Knight 1/6', 'hot-toys', 8200000, 14],
            ['Marvel Legends Captain America', 'hasbro', 650000, 8],
            ['Marvel Legends Thor Love and Thunder', 'hasbro', 690000, 8],
            ['Star Wars Black Series Darth Vader', 'hasbro', 720000, 8],
            ['Masters of the Universe He-Man', 'mattel', 480000, 6],
            ['DC Multiverse Superman', 'mattel', 520000, 6],
        ]],
        'gundam' => ['name' => 'Gundam / Gunpla', 'products' => [
            ['HG 1/144 RX-78-2 Gundam', 'bandai', 290000, 8],
            ['RG 1/144 Unicorn Gundam', 'bandai', 890000, 14],
            ['MG 1/100 Freedom Gundam 2.0', 'bandai', 1350000, 14],
            ['PG Unleashed 1/60 RX-78-2', 'bandai', 6900000, 14],
            ['HG 1/144 Gundam Aerial', 'bandai', 350000, 8],
            ['MGEX 1/100 Strike Freedom', 'bandai', 4200000, 14],
            ['SD Gundam Cross Silhouette Wing Zero', 'bandai', 250000, 8],
            ['Frame Arms Girl Stylet', 'kotobukiya', 1100000, 14],
        ]],
        'lego' => ['name' => 'LEGO', 'products' => [
            ['LEGO Technic Lamborghini Sián FKP 37', 'lego', 11900000, 18],
            ['LEGO Star Wars Millennium Falcon', 'lego', 4500000, 8],
            ['LEGO Harry Potter Hogwarts Castle', 'lego', 3200000, 8],
            ['LEGO City Trạm cứu hoả', 'lego', 1250000, 6],
            ['LEGO Ideas Tree House', 'lego', 5900000, 18],
            ['LEGO Classic Hộp gạch sáng tạo', 'lego', 690000, 3],
            ['LEGO Duplo Chuyến tàu số', 'lego', 790000, 0],
            ['LEGO Icons Bonsai Tree', 'lego', 1290000, 18],
        ]],
        'mo-hinh-xe' => ['name' => 'Mô hình xe', 'products' => [
            ['Tomica No.1 Nissan GT-R', 'tomica', 120000, 3],
            ['Tomica Premium Honda NSX', 'tomica', 250000, 6],
            ['Tomica Toyota Supra A90', 'tomica', 130000, 3],
            ['Hot Wheels Bộ 5 xe Mainline', 'mattel', 199000, 3],
            ['Hot Wheels Track Builder', 'mattel', 590000, 6],
            ['Tamiya 1/24 Porsche 911 GT3', 'tamiya', 1150000, 14],
            ['Tamiya Mini 4WD Avante Mk.III', 'tamiya', 320000, 8],
        ]],
        'funko-pop' => ['name' => 'Funko Pop', 'products' => [
            ['Funko Pop! Baby Yoda Grogu', 'funko', 390000, 3],
            ['Funko Pop! Iron Man Endgame', 'funko', 350000, 3],
            ['Funko Pop! Pikachu', 'funko', 350000, 3],
            ['Funko Pop! Harry Potter', 'funko', 350000, 3],
            ['Funko Pop! Naruto Uzumaki', 'funko', 370000, 3],
            ['Funko Pop! Stranger Things Eleven', 'funko', 360000, 3],
            ['Funko Pop! Batman 85th', 'funko', 380000, 3],
        ]],
        'anime-figure' => ['name' => 'Anime Figure', 'products' => [
            ['Nendoroid Hatsune Miku', 'good-smile', 1150000, 8],
            ['Nendoroid Gojo Satoru', 'good-smile', 1250000, 8],
            ['Pop Up Parade Frieren', 'good-smile', 950000, 8],
            ['figma Link Tears of the Kingdom', 'good-smile', 2100000, 14],
            ['ARTFX J Monkey D. Luffy', 'kotobukiya', 3200000, 14],
            ['S.H.Figuarts Son Goku Ultra Instinct', 'bandai', 1350000, 8],
            ['Ichiban Kuji Roronoa Zoro', 'bandai', 890000, 8],
            ['Bishoujo Asuka Langley', 'kotobukiya', 2600000, 14],
        ]],
        'board-game' => ['name' => 'Board game', 'products' => [
            ['Monopoly Classic', 'hasbro', 590000, 8],
            ['Cờ tỷ phú Việt Nam', 'hasbro', 390000, 8],
            ['UNO Flip', 'mattel', 120000, 6],
            ['Scrabble Original', 'mattel', 650000, 8],
            ['Jenga Classic', 'hasbro', 350000, 6],
            ['Connect 4', 'hasbro', 290000, 6],
            ['Pictionary Air', 'mattel', 490000, 8],
        ]],
        'phu-kien' => ['name' => 'Phụ kiện', 'products' => [
            ['Tamiya Panel Line Accent Color Đen', 'tamiya', 95000, 14],
            ['Bộ dụng cụ lắp ráp Gunpla', 'bandai', 350000, 14],
            ['Đế trưng bày Action Base 1', 'bandai', 180000, 8],
            ['Hộp trưng bày Funko Pop acrylic', 'funko', 250000, 3],
            ['Tamiya Bút sơn Gundam Marker', 'tamiya', 75000, 14],
            ['Kìm cắt nhựa Tamiya Sharp Pointed', 'tamiya', 420000, 14],
            ['Hộp đèn LED trưng bày LEGO', 'lego', 990000, 8],
        ]],
    ];

    public function run(): void
    {
        $brands = collect(self::BRANDS)->map(fn (string $name, string $slug) => Brand::factory()->create([
            'name' => $name,
            'slug' => $slug,
        ]));

        $admin = User::where('email', 'admin@toystore.test')->first();
        $index = 0;

        foreach (self::CATALOG as $categorySlug => $categoryData) {
            $category = Category::factory()->create([
                'name' => $categoryData['name'],
                'slug' => $categorySlug,
            ]);

            foreach ($categoryData['products'] as [$name, $brandSlug, $price, $minAge]) {
                $index++;
                $this->createProduct($index, $name, $category, $brands[$brandSlug], $price, $minAge, $admin);
            }
        }
    }

    private function createProduct(int $index, string $name, Category $category, Brand $brand, int $price, int $minAge, ?User $admin): void
    {
        $factory = Product::factory();

        // Phân bổ trạng thái có chủ đích để demo đủ trường hợp.
        // Giá giảm tính từ giá thật (không dùng state onSale vì nó tính trên giá ngẫu nhiên của factory).
        $salePrice = $index % 5 === 0 ? (int) round($price * (0.7 + ($index % 3) * 0.1), -3) : null;
        if ($index % 7 === 0) {
            $factory = $factory->featured();
        }
        if ($index % 9 === 0) {
            $factory = $factory->lowStock();
        }
        if ($index === 30) {
            $factory = $factory->outOfStock();
        }
        if ($index === 45) {
            $factory = $factory->hidden();
        }

        $product = $factory->create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => $name,
            'slug' => Str::slug($name),
            'sku' => sprintf('TS-%04d', $index),
            'description' => "{$name} chính hãng {$brand->name}. Hàng mới nguyên hộp, phù hợp sưu tầm và trưng bày.",
            'price' => $price,
            'sale_price' => $salePrice,
            'min_age' => $minAge,
        ]);

        $imageCount = ($index % 3) + 1;
        for ($i = 0; $i < $imageCount; $i++) {
            $product->images()->create([
                'path' => 'https://placehold.co/800x800/1a1a2e/e94560?text='.urlencode(Str::limit($name, 18, '')).'+'.($i + 1),
                'sort_order' => $i,
            ]);
        }

        if ($product->stock > 0) {
            $product->stockMovements()->create([
                'change' => $product->stock,
                'reason' => StockReason::Import,
                'user_id' => $admin?->id,
                'note' => 'Nhập kho ban đầu',
            ]);
        }
    }
}

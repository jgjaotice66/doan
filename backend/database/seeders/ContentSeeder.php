<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ContentSeeder extends Seeder
{
    /**
     * 3 banner trang chủ + 6 bài NEWS (5 đã đăng, 1 bản nháp).
     */
    public function run(): void
    {
        $banners = [
            ['Gunpla mùa mới – giảm đến 20%', '/products?category=gundam'],
            ['Hot Toys 1/6 – hàng về số lượng giới hạn', '/products?brand=hot-toys'],
            ['LEGO cho mọi lứa tuổi', '/products?category=lego'],
        ];
        foreach ($banners as $i => [$title, $link]) {
            Banner::factory()->create([
                'title' => $title,
                'image' => 'https://placehold.co/1600x600/0f0f1a/e94560?text='.urlencode($title),
                'link' => $link,
                'sort_order' => $i,
            ]);
        }

        $admin = User::where('email', 'admin@toystore.test')->firstOrFail();
        $titles = [
            'Bandai công bố lịch phát hành Gunpla quý tới',
            'Hướng dẫn kẻ lằn chìm cho người mới chơi Gundam',
            '5 mẫu LEGO Technic đáng mua nhất năm nay',
            'Cách bảo quản figure không bị ố vàng',
            'Funko Pop: vì sao giới trẻ mê sưu tầm?',
            'Sắp ra mắt: Nendoroid phiên bản giới hạn',
        ];
        foreach ($titles as $i => $title) {
            $factory = Post::factory();
            if ($i === count($titles) - 1) {
                $factory = $factory->draft();
            }
            $factory->create([
                'author_id' => $admin->id,
                'title' => $title,
                'slug' => Str::slug($title),
                'thumbnail' => 'https://placehold.co/1200x630/16213e/e94560?text=NEWS+'.($i + 1),
                'excerpt' => "Tóm tắt: {$title}.",
            ]);
        }
    }
}

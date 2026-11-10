<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\Post;
use App\Models\User;
use Database\Seeders\Concerns\TravelsInTime;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ContentSeeder extends Seeder
{
    use TravelsInTime;

    /**
     * [tiêu đề, link tới danh mục]
     *
     * @var list<array{0: string, 1: string}>
     */
    private const BANNERS = [
        ['Gunpla mùa mới – giảm đến 20%', '/products?category=gundam'],
        ['LEGO cho người lớn – xây bộ sưu tập của riêng bạn', '/products?category=lego'],
        ['Figure chính hãng cho tủ trưng bày', '/products?category=anime-figure'],
    ];

    /**
     * 6 bài NEWS: bài đầu ghim làm tin hot, bài cuối để nháp.
     * [tiêu đề, số ngày trước khi đăng, tóm tắt, nội dung HTML]
     *
     * @var list<array{0: string, 1: int, 2: string, 3: string}>
     */
    private const POSTS = [
        [
            'Bandai công bố lịch phát hành Gunpla quý tới',
            2,
            'Loạt kit HG, RG và MG mới sẽ lên kệ trong ba tháng tới. Toy Store nhận đặt trước từ tuần này.',
            <<<'HTML'
            <p>Bandai Spirits vừa công bố danh sách Gunpla phát hành trong quý tới, trải đều ở cả ba cấp độ phổ biến nhất. Đây là tin vui cho những ai đang chờ bổ sung tủ trưng bày dịp cuối năm.</p>
            <h2>Những cái tên đáng chú ý</h2>
            <ul>
              <li><strong>HG 1/144</strong>: hai mẫu mới từ series đang chiếu, giá dễ tiếp cận, phù hợp người mới bắt đầu.</li>
              <li><strong>RG 1/144</strong>: bản làm lại với khung xương nội thất chi tiết hơn và khớp vai cải tiến.</li>
              <li><strong>MG 1/100</strong>: phiên bản Ver.Ka kèm decal nước, dành cho người thích kẻ lằn và sơn.</li>
            </ul>
            <h2>Đặt trước tại Toy Store</h2>
            <p>Như mọi đợt hàng mới, số lượng về Việt Nam thường có hạn. Bạn có thể nhắn fanpage hoặc thêm sản phẩm vào <strong>Yêu thích</strong> để nhận thông báo khi hàng về. Đơn đặt trước được giữ giá theo thời điểm đặt.</p>
            <p>Trong lúc chờ, các mẫu HG và RG hiện có vẫn đang giảm đến 20% trong chương trình <strong>Gunpla mùa mới</strong>.</p>
            HTML,
        ],
        [
            'Hướng dẫn kẻ lằn chìm cho người mới chơi Gundam',
            6,
            'Chỉ với một cây bút kẻ lằn và mười lăm phút, mô hình của bạn sẽ trông “có chiều sâu” hơn hẳn.',
            <<<'HTML'
            <p>Kẻ lằn chìm (panel line) là bước nhỏ nhưng thay đổi lớn: những rãnh trên bề mặt mô hình được tô đậm để nổi rõ chi tiết. Đây là kỹ thuật đầu tiên mà hầu hết người chơi Gunpla học.</p>
            <h2>Chuẩn bị</h2>
            <ul>
              <li>Bút kẻ lằn đầu nhỏ (Gundam Marker hoặc Tamiya Panel Line Accent Color).</li>
              <li>Tăm bông và một ít cồn hoặc dung dịch lau bút để xoá phần lem.</li>
              <li>Mô hình đã lắp xong, bề mặt sạch bụi.</li>
            </ul>
            <h2>Các bước thực hiện</h2>
            <ol>
              <li>Kẻ theo các rãnh có sẵn, đi chậm và nhẹ tay. Không cần chính xác tuyệt đối.</li>
              <li>Chờ khoảng 1–2 phút cho mực khô bề mặt.</li>
              <li>Dùng tăm bông lau nhẹ phần mực tràn ra ngoài rãnh, mực trong rãnh sẽ được giữ lại.</li>
            </ol>
            <p><strong>Mẹo:</strong> với phần giáp màu trắng, dùng màu xám thay cho đen để đường lằn trông tự nhiên hơn.</p>
            HTML,
        ],
        [
            '5 mẫu LEGO Technic đáng mua nhất năm nay',
            12,
            'Từ siêu xe đến cần cẩu, đây là những bộ Technic vừa vui khi lắp vừa đẹp khi trưng bày.',
            <<<'HTML'
            <p>LEGO Technic không chỉ dành cho trẻ em: những bộ cỡ lớn có hộp số, hệ thống treo và động cơ mô phỏng hoạt động thật, đem lại cảm giác lắp ráp như một kỹ sư.</p>
            <h2>Danh sách của chúng tôi</h2>
            <ol>
              <li><strong>Lamborghini Sián FKP 37</strong> – hơn 3.600 chi tiết, hộp số 8 cấp, màu xanh lá đặc trưng.</li>
              <li><strong>Cần cẩu địa hình</strong> – cần nâng vươn dài, điều khiển bằng bánh răng.</li>
              <li><strong>Xe đua công thức 1</strong> – kích thước vừa phải, lắp xong trong một cuối tuần.</li>
              <li><strong>Mô tô phân khối lớn</strong> – động cơ piston chuyển động khi đẩy xe.</li>
              <li><strong>Máy xúc</strong> – lựa chọn phù hợp làm quà cho bạn nhỏ trên 10 tuổi.</li>
            </ol>
            <h2>Nên chọn bộ nào?</h2>
            <p>Nếu mới làm quen, hãy bắt đầu với bộ dưới 1.000 chi tiết. Nếu muốn một “trung tâm” cho kệ trưng bày, Lamborghini Sián là lựa chọn khó chê.</p>
            HTML,
        ],
        [
            'Cách bảo quản figure không bị ố vàng',
            20,
            'Ánh nắng, độ ẩm và bụi là ba “kẻ thù” của figure. Vài thói quen nhỏ giúp bộ sưu tập giữ màu nhiều năm.',
            <<<'HTML'
            <p>Figure PVC rất bền, nhưng sau vài năm có thể bị ố vàng, bạc màu hoặc nghiêng do để sai chỗ. Tin tốt là phần lớn có thể phòng tránh.</p>
            <h2>Tránh ánh nắng trực tiếp</h2>
            <p>Tia UV là nguyên nhân chính khiến nhựa trắng chuyển vàng. Đặt tủ trưng bày xa cửa sổ, hoặc dán phim chống UV cho kính tủ.</p>
            <h2>Kiểm soát độ ẩm</h2>
            <ul>
              <li>Đặt vài gói hút ẩm trong tủ kín và thay định kỳ 2–3 tháng.</li>
              <li>Mùa nồm ẩm, hạn chế mở tủ vào buổi sáng sớm.</li>
            </ul>
            <h2>Vệ sinh đúng cách</h2>
            <p>Dùng chổi lông mềm hoặc bóng thổi bụi. Không dùng cồn lên phần sơn vì có thể làm mờ lớp hoàn thiện.</p>
            <p><strong>Lưu ý:</strong> với figure có phần chân mảnh, nên dùng đế đỡ để tránh bị nghiêng theo thời gian.</p>
            HTML,
        ],
        [
            'Funko Pop: vì sao giới trẻ mê sưu tầm?',
            30,
            'Giá vừa túi tiền, kích thước nhỏ gọn và có mặt ở hầu hết thương hiệu phim, game — Funko Pop là cửa ngõ của nhiều người vào thế giới sưu tầm.',
            <<<'HTML'
            <p>Chỉ trong vài năm, những bức tượng đầu to mắt đen của Funko đã xuất hiện trên bàn làm việc của rất nhiều bạn trẻ. Điều gì khiến chúng hấp dẫn đến vậy?</p>
            <h2>Dễ bắt đầu</h2>
            <p>Mỗi Pop có giá vừa phải, cao khoảng 9,5 cm và dùng chung một phong cách. Bạn có thể bắt đầu từ nhân vật yêu thích nhất rồi mở rộng dần mà bộ sưu tập vẫn đồng bộ.</p>
            <h2>Gần như nhân vật nào cũng có</h2>
            <p>Từ siêu anh hùng Marvel, Star Wars, anime đến cả ban nhạc và vận động viên — danh mục của Funko lên tới hàng nghìn mẫu.</p>
            <h2>Giữ hộp hay bóc hộp?</h2>
            <ul>
              <li><strong>Giữ hộp</strong>: phù hợp nếu bạn quan tâm giá trị sưu tầm lâu dài.</li>
              <li><strong>Bóc hộp</strong>: trưng bày gọn hơn, dễ xếp theo chủ đề.</li>
            </ul>
            <p>Dù chọn cách nào, một hộp trưng bày acrylic sẽ giúp Pop của bạn luôn sạch bụi.</p>
            HTML,
        ],
        [
            'Sắp ra mắt: Nendoroid phiên bản giới hạn',
            0,
            'Good Smile chuẩn bị mở đặt trước một mẫu Nendoroid giới hạn. Bài viết sẽ cập nhật khi có thông tin chính thức.',
            <<<'HTML'
            <p>Good Smile Company vừa hé lộ hình ảnh đầu tiên của một mẫu Nendoroid phiên bản giới hạn. Thông tin về giá và số lượng sẽ được cập nhật khi hãng công bố chính thức.</p>
            <h2>Những gì đã biết</h2>
            <ul>
              <li>Kèm ba gương mặt thay thế và phụ kiện độc quyền.</li>
              <li>Chỉ mở đặt trước trong thời gian ngắn.</li>
            </ul>
            HTML,
        ],
    ];

    public function run(): void
    {
        foreach (self::BANNERS as $i => [$title, $link]) {
            Banner::factory()->create([
                'title' => $title,
                'image' => 'https://placehold.co/1600x600/0f0f1a/e94560?text='.urlencode($title),
                'link' => $link,
                'sort_order' => $i,
            ]);
        }

        $admin = User::where('email', 'admin@toystore.test')->firstOrFail();
        $last = count(self::POSTS) - 1;

        foreach (self::POSTS as $i => [$title, $daysAgo, $excerpt, $content]) {
            $at = now()->subDays($daysAgo)->setTime(8 + $i, 30);

            $this->at($at, function () use ($i, $last, $admin, $title, $excerpt, $content, $at) {
                $factory = Post::factory();
                if ($i === 0) {
                    $factory = $factory->featured();
                }
                if ($i === $last) {
                    $factory = $factory->draft();
                }

                $factory->create([
                    'author_id' => $admin->id,
                    'title' => $title,
                    'slug' => Str::slug($title),
                    'thumbnail' => 'https://placehold.co/1200x630/16213e/e94560?text=NEWS+'.($i + 1),
                    'excerpt' => $excerpt,
                    'content' => trim($content),
                    ...($i === $last ? [] : ['published_at' => $at]),
                ]);
            });
        }
    }
}

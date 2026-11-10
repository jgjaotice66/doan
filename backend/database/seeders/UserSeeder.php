<?php

namespace Database\Seeders;

use App\Models\User;
use Database\Seeders\Concerns\TravelsInTime;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    use TravelsInTime;

    /**
     * Khách hàng mẫu (mật khẩu đều là "password"). Địa chỉ dùng khi tạo đơn mẫu.
     *
     * @var list<array{name: string, email: string, phone: string, address: string}>
     */
    public const CUSTOMERS = [
        ['name' => 'Nguyễn Văn Khách', 'email' => 'khach@toystore.test', 'phone' => '0912345678', 'address' => '12 Nguyễn Trãi, P. Bến Thành, Q.1, TP. Hồ Chí Minh'],
        ['name' => 'Trần Minh Anh', 'email' => 'minhanh@toystore.test', 'phone' => '0987654321', 'address' => '45 Láng Hạ, P. Thành Công, Q. Ba Đình, Hà Nội'],
        ['name' => 'Lê Hoàng Phúc', 'email' => 'hoangphuc@toystore.test', 'phone' => '0903111222', 'address' => '88 Lê Duẩn, P. Thạch Thang, Q. Hải Châu, Đà Nẵng'],
        ['name' => 'Phạm Thu Hà', 'email' => 'thuha@toystore.test', 'phone' => '0938222333', 'address' => '27 Trần Hưng Đạo, P. Hàng Bài, Q. Hoàn Kiếm, Hà Nội'],
        ['name' => 'Võ Quốc Bảo', 'email' => 'quocbao@toystore.test', 'phone' => '0977333444', 'address' => '150 Võ Văn Tần, P. 5, Q.3, TP. Hồ Chí Minh'],
        ['name' => 'Đặng Ngọc Linh', 'email' => 'ngoclinh@toystore.test', 'phone' => '0965444555', 'address' => '9 Hùng Vương, P. Phú Nhuận, TP. Huế'],
        ['name' => 'Bùi Gia Huy', 'email' => 'giahuy@toystore.test', 'phone' => '0911555666', 'address' => '61 Nguyễn Văn Cừ, P. An Khánh, Q. Ninh Kiều, Cần Thơ'],
        ['name' => 'Hoàng Thảo Vy', 'email' => 'thaovy@toystore.test', 'phone' => '0944666777', 'address' => '233 Lạch Tray, P. Đằng Giang, Q. Ngô Quyền, Hải Phòng'],
    ];

    /** Ngày đăng ký của từng khách (số ngày trước), cùng thứ tự CUSTOMERS: khách đầu đăng ký sớm nhất, 2 khách mới trong tháng. */
    private const REGISTERED_DAYS_AGO = [345, 320, 270, 210, 160, 95, 6, 2];

    public function run(): void
    {
        $this->at(now()->subDays(365)->setTime(8, 0), fn () => User::factory()->admin()->create([
            'name' => 'Quản trị viên',
            'email' => 'admin@toystore.test',
        ]));

        foreach (self::CUSTOMERS as $i => $customer) {
            $this->at(now()->subDays(self::REGISTERED_DAYS_AGO[$i])->setTime(10 + $i, 15), fn () => User::factory()->create([
                'name' => $customer['name'],
                'email' => $customer['email'],
                'phone' => $customer['phone'],
            ]));
        }
    }
}

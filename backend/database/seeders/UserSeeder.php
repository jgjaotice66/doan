<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * 1 quản trị viên + 5 khách hàng (mật khẩu đều là "password").
     */
    public function run(): void
    {
        User::factory()->admin()->create([
            'name' => 'Quản trị viên',
            'email' => 'admin@toystore.test',
        ]);

        User::factory()->create([
            'name' => 'Nguyễn Văn Khách',
            'email' => 'khach@toystore.test',
        ]);

        User::factory(4)->create();
    }
}

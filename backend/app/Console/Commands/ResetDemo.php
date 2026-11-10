<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/**
 * Đưa hệ thống về trạng thái demo chuẩn (dùng trước buổi bảo vệ):
 * xoá file đã upload → migrate:fresh --seed → đảm bảo có storage:link.
 */
#[Signature('app:reset-demo {--force : Không hỏi xác nhận}')]
#[Description('Xoá toàn bộ dữ liệu và nạp lại dữ liệu demo (ảnh, sản phẩm, đơn hàng, tin tức)')]
class ResetDemo extends Command
{
    public function handle(): int
    {
        if ($this->laravel->isProduction()) {
            $this->error('Không chạy lệnh này trên môi trường production.');

            return self::FAILURE;
        }

        if (! $this->option('force') && ! $this->confirm('Xoá TOÀN BỘ dữ liệu hiện tại và nạp lại dữ liệu demo?')) {
            $this->info('Đã huỷ, dữ liệu giữ nguyên.');

            return self::SUCCESS;
        }

        $this->components->task('Xoá file đã upload', fn () => $this->clearPublicDisk());
        $this->components->task('Tạo lại database + dữ liệu demo', fn () => $this->callSilently('migrate:fresh', ['--seed' => true, '--force' => true]) === self::SUCCESS);

        if (! File::exists(public_path('storage'))) {
            $this->components->task('Tạo liên kết storage', fn () => $this->callSilently('storage:link') === self::SUCCESS);
        }

        $this->newLine();
        $this->components->twoColumnDetail('Sản phẩm', (string) Product::count());
        $this->components->twoColumnDetail('Đơn hàng', (string) Order::count());
        $this->components->twoColumnDetail('Khách hàng', (string) User::where('role', 'customer')->count());
        $this->components->twoColumnDetail('Admin', 'admin@toystore.test / password');
        $this->components->twoColumnDetail('Khách demo', 'khach@toystore.test / password');

        return self::SUCCESS;
    }

    /**
     * Xoá mọi thư mục/file trong storage/app/public (ảnh sản phẩm, banner, minh chứng trả hàng…), giữ .gitignore.
     */
    private function clearPublicDisk(): void
    {
        $disk = Storage::disk('public');

        foreach ($disk->directories() as $directory) {
            $disk->deleteDirectory($directory);
        }
        foreach ($disk->files() as $file) {
            if ($file !== '.gitignore') {
                $disk->delete($file);
            }
        }
    }
}

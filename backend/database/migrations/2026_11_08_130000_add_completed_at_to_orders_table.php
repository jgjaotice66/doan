<?php

use App\Enums\OrderStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Thời điểm đơn chuyển sang "Hoàn thành": doanh thu tính vào ngày này
 * (và thời hạn trả hàng 10 ngày của task 44 cũng tính từ đây).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('completed_at')->nullable()->after('status');
            $table->index(['status', 'completed_at']);
        });

        // Đơn đã hoàn thành từ trước: lấy tạm lần cập nhật cuối (gần nhất với lúc chuyển trạng thái).
        DB::table('orders')
            ->where('status', OrderStatus::Completed->value)
            ->update(['completed_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status', 'completed_at']);
            $table->dropColumn('completed_at');
        });
    }
};

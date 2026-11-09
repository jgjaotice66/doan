<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Trả hàng sau khi giao: yêu cầu (1 đơn có thể nhiều yêu cầu, tối đa 1 yêu cầu đang mở),
 * các món trả + số lượng, ảnh/video bằng chứng.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('status', 20)->index();
            $table->string('reason', 20);
            $table->text('description')->nullable();
            // Tài khoản khách nhận tiền hoàn (hoàn thủ công).
            $table->string('bank_name', 100);
            $table->string('bank_account', 30);
            $table->string('account_name', 100);
            $table->unsignedInteger('refund_amount')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('received_at')->nullable();
            // Dashboard trừ tiền hoàn vào doanh thu theo ngày này.
            $table->timestamp('refunded_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('return_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->boolean('restock')->default(false);
            $table->timestamps();

            $table->unique(['return_request_id', 'order_item_id']);
        });

        Schema::create('return_request_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_request_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('type', 10); // image | video
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_request_media');
        Schema::dropIfExists('return_request_items');
        Schema::dropIfExists('return_requests');
    }
};

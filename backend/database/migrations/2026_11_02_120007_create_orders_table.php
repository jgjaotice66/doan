<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('recipient_name');
            $table->string('phone', 20);
            $table->string('address');
            $table->text('note')->nullable();
            $table->unsignedBigInteger('subtotal');
            $table->unsignedBigInteger('shipping_fee');
            $table->unsignedBigInteger('total');
            $table->string('payment_method', 20);
            $table->string('payment_status', 20)->default('unpaid');
            $table->string('status', 20)->default('pending')->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};

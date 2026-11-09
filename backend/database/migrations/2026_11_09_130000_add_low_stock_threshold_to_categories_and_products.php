<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ngưỡng "sắp hết hàng" riêng. null = dùng mức trên: sản phẩm → danh mục → danh mục cha → ngưỡng chung (settings).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->unsignedSmallInteger('low_stock_threshold')->nullable()->after('image');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->unsignedSmallInteger('low_stock_threshold')->nullable()->after('stock');
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('low_stock_threshold'));
        Schema::table('categories', fn (Blueprint $table) => $table->dropColumn('low_stock_threshold'));
    }
};

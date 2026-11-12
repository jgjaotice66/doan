<?php

use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReturnController;
use App\Http\Controllers\Api\WishlistController;
use App\Support\ShopSettings;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/ping', fn () => ['status' => 'ok']);

    // Catalog công khai.
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/brands', [BrandController::class, 'index']);
    Route::get('/banners', [BannerController::class, 'index']);
    // Ô chọn ngân hàng nhận tiền hoàn (form trả hàng).
    Route::get('/banks', fn () => ['data' => ShopSettings::banks()]);
    // Thông tin cửa hàng cho storefront: hotline (nút gọi nổi), chính sách đổi trả và phí ship (footer, trang sản phẩm).
    Route::get('/shop', fn () => ['data' => [
        'hotline' => ShopSettings::hotline(),
        'return_days' => (int) config('shop.return_days'),
        'shipping_fee' => (int) config('shop.shipping_fee'),
    ]]);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slug}', [ProductController::class, 'show']);
    Route::get('/posts', [PostController::class, 'index']);
    // Khai báo trước /posts/{slug}, nếu không "highlights" bị hiểu là slug.
    Route::get('/posts/highlights', [PostController::class, 'highlights']);
    Route::get('/posts/{slug}', [PostController::class, 'show']);

    // Khách vãng lai — giới hạn 10 lần/phút để chống dò mật khẩu.
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('/auth/register', [AuthController::class, 'register']);
        Route::post('/auth/login', [AuthController::class, 'login']);
    });

    // Đã đăng nhập (và tài khoản chưa bị khoá).
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/me', [ProfileController::class, 'show']);
        Route::put('/me', [ProfileController::class, 'update']);
        Route::put('/me/password', [ProfileController::class, 'updatePassword']);

        Route::get('/cart', [CartController::class, 'index']);
        Route::post('/cart', [CartController::class, 'store']);
        Route::patch('/cart/{id}', [CartController::class, 'update'])->whereNumber('id');
        Route::delete('/cart/{id}', [CartController::class, 'destroy'])->whereNumber('id');

        Route::get('/wishlist', [WishlistController::class, 'index']);
        Route::post('/wishlist', [WishlistController::class, 'store']);
        Route::delete('/wishlist/{productId}', [WishlistController::class, 'destroy'])->whereNumber('productId');

        Route::get('/orders', [OrderController::class, 'index']);
        Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:10,1');
        Route::get('/orders/{code}', [OrderController::class, 'show']);
        Route::post('/orders/{code}/cancel', [OrderController::class, 'cancel']);
        Route::post('/orders/{code}/returns', [ReturnController::class, 'store'])->middleware('throttle:10,1');

        // Quản trị viên.
        Route::prefix('admin')->name('admin.')->middleware('admin')->group(function () {
            Route::get('/ping', fn () => ['status' => 'ok', 'scope' => 'admin']);

            Route::get('/dashboard/summary', [Admin\DashboardController::class, 'summary'])->name('dashboard.summary');
            Route::get('/dashboard/revenue', [Admin\DashboardController::class, 'revenue'])->name('dashboard.revenue');
            Route::get('/dashboard/top-products', [Admin\DashboardController::class, 'topProducts'])->name('dashboard.top-products');
            Route::get('/dashboard/order-status', [Admin\DashboardController::class, 'orderStatus'])->name('dashboard.order-status');

            Route::apiResource('categories', Admin\CategoryController::class)->except('show');
            Route::apiResource('brands', Admin\BrandController::class)->except('show');

            Route::apiResource('products', Admin\ProductController::class);
            Route::post('/products/{product}/images', [Admin\ProductImageController::class, 'store'])->name('products.images.store');
            Route::put('/products/{product}/images/order', [Admin\ProductImageController::class, 'reorder'])->name('products.images.reorder');
            Route::delete('/product-images/{productImage}', [Admin\ProductImageController::class, 'destroy'])->name('product-images.destroy');

            Route::get('/orders', [Admin\OrderController::class, 'index'])->name('orders.index');
            Route::get('/orders/{order}', [Admin\OrderController::class, 'show'])->name('orders.show');
            Route::patch('/orders/{order}/status', [Admin\OrderController::class, 'updateStatus'])->name('orders.status');
            Route::patch('/orders/{order}/payment', [Admin\OrderController::class, 'markPaid'])->name('orders.payment');
            Route::patch('/orders/{order}/refund', [Admin\OrderController::class, 'markRefunded'])->name('orders.refund');

            Route::get('/returns', [Admin\ReturnController::class, 'index'])->name('returns.index');
            Route::get('/returns/{returnRequest}', [Admin\ReturnController::class, 'show'])->name('returns.show');
            Route::patch('/returns/{returnRequest}/approve', [Admin\ReturnController::class, 'approve'])->name('returns.approve');
            Route::patch('/returns/{returnRequest}/reject', [Admin\ReturnController::class, 'reject'])->name('returns.reject');
            Route::patch('/returns/{returnRequest}/receive', [Admin\ReturnController::class, 'receive'])->name('returns.receive');
            Route::patch('/returns/{returnRequest}/refund', [Admin\ReturnController::class, 'refund'])->name('returns.refund');

            Route::get('/inventory', [Admin\InventoryController::class, 'index'])->name('inventory.index');
            Route::get('/inventory/movements', [Admin\InventoryController::class, 'movements'])->name('inventory.movements');
            Route::patch('/inventory/{product}/threshold', [Admin\InventoryController::class, 'threshold'])->name('inventory.threshold');
            Route::post('/inventory/{product}/adjust', [Admin\InventoryController::class, 'adjust'])->name('inventory.adjust');

            Route::get('/users', [Admin\UserController::class, 'index'])->name('users.index');
            Route::patch('/users/{user}/toggle-active', [Admin\UserController::class, 'toggleActive'])->name('users.toggle-active');

            // /order phải khai báo trước apiResource, nếu không "order" bị hiểu là {banner}.
            Route::put('/banners/order', [Admin\BannerController::class, 'reorder'])->name('banners.reorder');
            Route::patch('/banners/{banner}/toggle-active', [Admin\BannerController::class, 'toggleActive'])->name('banners.toggle-active');
            Route::apiResource('banners', Admin\BannerController::class)->except('show');

            Route::post('/posts/images', [Admin\PostController::class, 'uploadImage'])->name('posts.images');
            Route::apiResource('posts', Admin\PostController::class);

            Route::get('/settings', [Admin\SettingController::class, 'show'])->name('settings.show');
            Route::put('/settings', [Admin\SettingController::class, 'update'])->name('settings.update');
            Route::put('/settings/low-stock', [Admin\SettingController::class, 'updateLowStock'])->name('settings.low-stock');
            Route::put('/settings/hotline', [Admin\SettingController::class, 'updateHotline'])->name('settings.hotline');
        });
    });
});

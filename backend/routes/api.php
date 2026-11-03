<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/ping', fn () => ['status' => 'ok']);

    // Catalog công khai.
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/brands', [BrandController::class, 'index']);
    Route::get('/banners', [BannerController::class, 'index']);

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

        // Quản trị viên.
        Route::prefix('admin')->middleware('admin')->group(function () {
            Route::get('/ping', fn () => ['status' => 'ok', 'scope' => 'admin']);
        });
    });
});

<?php

use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsureAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => EnsureAdmin::class,
            'active' => EnsureActiveUser::class,
        ]);

        // Kiểm tra quyền trước khi tìm model theo id trên URL: khách gọi /admin/categories/999
        // nhận 403 thay vì 404 (không dò được id nào tồn tại, không tốn truy vấn).
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: EnsureAdmin::class);
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: EnsureActiveUser::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

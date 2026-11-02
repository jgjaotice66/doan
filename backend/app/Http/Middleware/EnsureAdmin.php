<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Chỉ cho phép tài khoản quản trị đi tiếp.
 */
class EnsureAdmin
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->isAdmin(), Response::HTTP_FORBIDDEN, 'Bạn không có quyền truy cập khu vực quản trị');

        return $next($request);
    }
}

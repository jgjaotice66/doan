<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Chặn tài khoản đã bị khoá dù vẫn còn token cũ.
 */
class EnsureActiveUser
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        abort_if($request->user() && ! $request->user()->is_active, Response::HTTP_FORBIDDEN, 'Tài khoản đã bị khoá');

        return $next($request);
    }
}

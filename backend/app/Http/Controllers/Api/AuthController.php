<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Đăng ký tài khoản khách hàng và trả về token.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->safe()->only(['name', 'email', 'phone', 'password']))->refresh();

        return response()->json($this->tokenPayload($user), Response::HTTP_CREATED);
    }

    /**
     * Đăng nhập bằng email + mật khẩu.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Email hoặc mật khẩu không đúng.',
            ]);
        }

        abort_unless($user->is_active, Response::HTTP_FORBIDDEN, 'Tài khoản đã bị khoá');

        return response()->json($this->tokenPayload($user));
    }

    /**
     * Thu hồi token đang dùng.
     */
    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    /**
     * @return array{user: UserResource, token: string}
     */
    private function tokenPayload(User $user): array
    {
        return [
            'user' => new UserResource($user),
            'token' => $user->createToken('spa')->plainTextToken,
        ];
    }
}

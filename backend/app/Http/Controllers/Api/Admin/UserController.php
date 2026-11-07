<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Quản lý tài khoản: xem khách + số đơn / chi tiêu, khoá / mở khoá.
 */
class UserController extends Controller
{
    private const SORTS = [
        'newest' => ['created_at', 'desc'],
        'top_spent' => ['total_spent', 'desc'],
        'most_orders' => ['orders_count', 'desc'],
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::enum(UserRole::class)],
            'is_active' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(array_keys(self::SORTS))],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        [$column, $direction] = self::SORTS[$validated['sort'] ?? 'newest'];

        $users = $this->withStats(User::query())
            ->when($validated['q'] ?? null, fn ($query, $q) => $query->where(
                fn ($query) => $query->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%"),
            ))
            ->when($validated['role'] ?? null, fn ($query, $role) => $query->where('role', $role))
            ->when($request->has('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderBy($column, $direction)
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 10);

        return AdminUserResource::collection($users);
    }

    /**
     * Khoá → xoá mọi token (đăng xuất ngay trên mọi thiết bị); đăng nhập lại bị chặn ở AuthController.
     * Không cho tự khoá mình (tránh admin cuối cùng tự nhốt mình ngoài hệ thống).
     */
    public function toggleActive(Request $request, User $user): AdminUserResource
    {
        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['user' => 'Bạn không thể tự khoá tài khoản của chính mình.']);
        }

        DB::transaction(function () use ($user) {
            $user->is_active = ! $user->is_active;
            $user->save();

            if (! $user->is_active) {
                $user->tokens()->delete();
            }
        });

        return new AdminUserResource($this->withStats(User::query())->findOrFail($user->id));
    }

    /**
     * Số đơn (mọi trạng thái) + tổng chi tiêu = tổng tiền đơn đã thanh toán và chưa huỷ
     * (đơn huỷ chờ hoàn / đã hoàn tiền không tính).
     *
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    private function withStats(Builder $query): Builder
    {
        return $query
            ->withCount('orders')
            ->withSum(['orders as total_spent' => fn ($query) => $query
                ->where('payment_status', PaymentStatus::Paid)
                ->where('status', '!=', OrderStatus::Cancelled)], 'total');
    }
}

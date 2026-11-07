<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Tài khoản phía admin: kèm số đơn + tổng chi tiêu (withCount / withSum ở controller).
 *
 * @mixin User
 */
class AdminUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => ['value' => $this->role->value, 'label' => $this->role->label()],
            'is_active' => $this->is_active,
            'orders_count' => (int) ($this->orders_count ?? 0),
            'total_spent' => (int) ($this->total_spent ?? 0),
            // Giao diện khoá công tắc ở dòng của chính mình.
            'is_self' => $request->user()?->id === $this->id,
            'created_at' => $this->created_at,
        ];
    }
}

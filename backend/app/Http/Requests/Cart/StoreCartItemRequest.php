<?php

namespace App\Http\Requests\Cart;

use App\Models\Product;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Chỉ thêm được sản phẩm đang bán (không ẩn, không bị xoá).
            'product_id' => ['required', 'integer', Product::activeExistsRule()],
            'quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'product_id.exists' => 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.',
            'quantity.min' => 'Số lượng tối thiểu là 1.',
            'quantity.max' => 'Mỗi lần chỉ thêm tối đa 99 sản phẩm.',
        ];
    }
}

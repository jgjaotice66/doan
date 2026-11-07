<?php

namespace App\Http\Requests\Admin;

use App\Enums\ProductStatus;
use App\Models\Product;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Tạo/sửa sản phẩm. Tồn kho chỉ nhập lúc tạo (ghi lịch sử nhập kho);
 * sau đó mọi thay đổi tồn đi qua màn Kho để luôn có lịch sử.
 */
class ProductRequest extends FormRequest
{
    public const MAX_IMAGES = 10;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $creating = $this->route('product') === null;

        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'brand_id' => ['required', 'integer', 'exists:brands,id'],
            'name' => ['required', 'string', 'max:255'],
            // Unique tính cả sản phẩm đã xoá mềm (cột sku là unique trong DB).
            'sku' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('products', 'sku')->ignore($this->route('product'))],
            'description' => ['nullable', 'string', 'max:20000'],
            'price' => ['required', 'integer', 'min:1000', 'max:1000000000'],
            'sale_price' => ['nullable', 'integer', 'min:0', 'lt:price'],
            'stock' => $creating ? ['required', 'integer', 'min:0', 'max:100000'] : ['prohibited'],
            'min_age' => ['required', 'integer', Rule::in(Product::AGE_GROUPS)],
            'is_featured' => ['sometimes', 'boolean'],
            'status' => ['required', Rule::enum(ProductStatus::class)],
            // Ảnh chỉ gửi kèm lúc tạo; sau đó dùng API ảnh riêng.
            'images' => $creating ? ['sometimes', 'array', 'max:'.self::MAX_IMAGES] : ['prohibited'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'category_id.required' => 'Vui lòng chọn danh mục.',
            'category_id.exists' => 'Danh mục không tồn tại.',
            'brand_id.required' => 'Vui lòng chọn thương hiệu.',
            'brand_id.exists' => 'Thương hiệu không tồn tại.',
            'name.required' => 'Vui lòng nhập tên sản phẩm.',
            'sku.required' => 'Vui lòng nhập mã SKU.',
            'sku.regex' => 'SKU chỉ gồm chữ không dấu, số và các ký tự . _ - (không dấu cách).',
            'sku.unique' => 'Mã SKU này đã được dùng (kể cả sản phẩm đã xoá).',
            'price.required' => 'Vui lòng nhập giá bán.',
            'price.min' => 'Giá bán tối thiểu 1.000 ₫.',
            'sale_price.lt' => 'Giá khuyến mãi phải nhỏ hơn giá gốc.',
            'stock.required' => 'Vui lòng nhập tồn kho ban đầu.',
            'stock.min' => 'Tồn kho không được âm.',
            'stock.prohibited' => 'Không sửa tồn kho ở đây — hãy dùng màn Kho để nhập/điều chỉnh (có lưu lịch sử).',
            'min_age.in' => 'Độ tuổi phải là một trong: '.implode(', ', Product::AGE_GROUPS).'.',
            'status.enum' => 'Trạng thái không hợp lệ.',
            'images.max' => 'Mỗi sản phẩm tối đa '.self::MAX_IMAGES.' ảnh.',
            'images.prohibited' => 'Thêm/xoá ảnh bằng mục Ảnh sản phẩm.',
            'images.*.image' => 'File phải là ảnh.',
            'images.*.mimes' => 'Ảnh phải có định dạng jpg, png hoặc webp.',
            'images.*.max' => 'Mỗi ảnh tối đa 2MB.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'tên sản phẩm',
            'price' => 'giá bán',
            'sale_price' => 'giá khuyến mãi',
            'stock' => 'tồn kho',
            'min_age' => 'độ tuổi',
        ];
    }
}

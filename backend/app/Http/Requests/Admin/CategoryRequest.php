<?php

namespace App\Http\Requests\Admin;

use App\Models\Category;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Tạo/sửa danh mục. Cây chỉ có 2 cấp (gốc → con), nên:
 * cha phải là danh mục gốc, không phải chính nó, và danh mục đang có con thì không thể thành con.
 */
class CategoryRequest extends FormRequest
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
        /** @var Category|null $category */
        $category = $this->route('category');
        $parentId = $this->input('parent_id');

        return [
            'name' => [
                'required', 'string', 'max:100',
                // Không trùng tên trong cùng cấp (cùng danh mục cha).
                Rule::unique('categories', 'name')
                    ->where(fn ($query) => $parentId ? $query->where('parent_id', $parentId) : $query->whereNull('parent_id'))
                    ->ignore($category),
            ],
            'parent_id' => [
                'nullable', 'integer',
                function (string $attribute, mixed $value, Closure $fail) use ($category) {
                    if ($category && (int) $value === $category->id) {
                        $fail('Danh mục không thể là danh mục cha của chính nó.');
                    } elseif ($category && $category->children()->exists()) {
                        $fail('Danh mục này đang có danh mục con nên không thể chuyển thành danh mục con.');
                    }
                },
                Rule::exists('categories', 'id')->whereNull('parent_id'),
            ],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_image' => ['sometimes', 'boolean'],
            // Bỏ trống = dùng ngưỡng của danh mục cha / ngưỡng chung.
            'low_stock_threshold' => ['nullable', 'integer', 'min:0', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Vui lòng nhập tên danh mục.',
            'name.max' => 'Tên danh mục tối đa 100 ký tự.',
            'name.unique' => 'Đã có danh mục cùng tên ở cấp này.',
            'parent_id.exists' => 'Danh mục cha phải là danh mục gốc (chỉ hỗ trợ 2 cấp).',
            'image.image' => 'File phải là ảnh.',
            'image.mimes' => 'Ảnh phải có định dạng jpg, png hoặc webp.',
            'image.max' => 'Ảnh tối đa 2MB.',
            'low_stock_threshold.integer' => 'Ngưỡng phải là số nguyên.',
            'low_stock_threshold.min' => 'Ngưỡng không được âm.',
            'low_stock_threshold.max' => 'Ngưỡng tối đa 1000.',
        ];
    }
}

<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Ảnh chèn vào nội dung soạn thảo (bài viết, mô tả sản phẩm): tải lên trước rồi chèn bằng URL,
 * không để trình soạn thảo nhét ảnh base64 thẳng vào HTML.
 */
class ContentImageRequest extends FormRequest
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
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'image.required' => 'Vui lòng chọn ảnh.',
            'image.image' => 'File phải là ảnh.',
            'image.mimes' => 'Ảnh phải có định dạng jpg, png, webp hoặc gif.',
            'image.max' => 'Ảnh tối đa 5MB.',
            'image.uploaded' => 'Tải ảnh lên thất bại (file có thể quá lớn), vui lòng thử lại.',
        ];
    }
}

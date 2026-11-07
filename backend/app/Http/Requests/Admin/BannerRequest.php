<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class BannerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Link: đường dẫn trong trang (/products?brand=3) hoặc link ngoài http(s) — chặn javascript:… và chữ tuỳ tiện.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $creating = $this->isMethod('post') && ! $this->route('banner');

        return [
            'title' => ['required', 'string', 'max:150'],
            'link' => ['nullable', 'string', 'max:255', 'regex:#^(/(?!/)|https?://)\S*$#'],
            'is_active' => ['sometimes', 'boolean'],
            'image' => [$creating ? 'required' : 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Vui lòng nhập tiêu đề banner.',
            'title.max' => 'Tiêu đề tối đa 150 ký tự.',
            'link.regex' => 'Link phải bắt đầu bằng / (trang trong cửa hàng) hoặc http(s):// (trang ngoài).',
            'link.max' => 'Link tối đa 255 ký tự.',
            'image.required' => 'Vui lòng chọn ảnh banner.',
            'image.image' => 'File phải là ảnh.',
            'image.mimes' => 'Ảnh phải có định dạng jpg, png hoặc webp.',
            'image.max' => 'Ảnh tối đa 10MB.',
            'image.uploaded' => 'Tải ảnh lên thất bại (file có thể quá lớn), vui lòng thử lại.',
        ];
    }
}

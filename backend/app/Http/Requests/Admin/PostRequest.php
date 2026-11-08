<?php

namespace App\Http\Requests\Admin;

use App\Support\PostContent;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class PostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Gửi multipart (có ảnh đại diện); sửa có ảnh thì POST kèm _method=PUT.
     * slug để trống → tự sinh từ tiêu đề. published_at để trống mà bật xuất bản → đăng ngay.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'slug' => [
                'nullable', 'string', 'max:200', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('posts', 'slug')->ignore($this->route('post')),
            ],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'content' => ['required', 'string', 'max:500000'],
            'is_published' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_thumbnail' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Nội dung chỉ toàn thẻ nguy hiểm/rỗng → sau khi lọc không còn gì → báo lỗi.
     *
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if (! $validator->errors()->has('content') && PostContent::isBlank(PostContent::clean($this->input('content')))) {
                    $validator->errors()->add('content', 'Nội dung bài viết không được để trống.');
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Vui lòng nhập tiêu đề bài viết.',
            'title.max' => 'Tiêu đề tối đa 200 ký tự.',
            'slug.regex' => 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang (VD: gundam-moi-ve).',
            'slug.unique' => 'Slug này đã được bài khác dùng.',
            'slug.max' => 'Slug tối đa 200 ký tự.',
            'excerpt.max' => 'Tóm tắt tối đa 500 ký tự.',
            'content.required' => 'Nội dung bài viết không được để trống.',
            'content.max' => 'Nội dung quá dài.',
            'published_at.date' => 'Ngày đăng không hợp lệ.',
            'thumbnail.image' => 'Ảnh đại diện phải là file ảnh.',
            'thumbnail.mimes' => 'Ảnh đại diện phải có định dạng jpg, png hoặc webp.',
            'thumbnail.max' => 'Ảnh đại diện tối đa 5MB.',
            'thumbnail.uploaded' => 'Tải ảnh lên thất bại (file có thể quá lớn), vui lòng thử lại.',
        ];
    }
}

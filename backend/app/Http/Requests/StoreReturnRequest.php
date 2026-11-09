<?php

namespace App\Http\Requests;

use App\Enums\ReturnReason;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Khách gửi yêu cầu trả hàng (multipart). Quy tắc theo đơn (còn hạn, SL còn trả được…) kiểm tra ở ReturnService.
 */
class StoreReturnRequest extends FormRequest
{
    public const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    public const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

    public const IMAGE_MAX_KB = 5 * 1024;

    public const VIDEO_MAX_KB = 50 * 1024;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', Rule::enum(ReturnReason::class)],
            'description' => ['nullable', 'required_if:reason,'.ReturnReason::Other->value, 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.order_item_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'media' => ['required', 'array', 'min:1', 'max:5'],
            'media.*' => ['required', 'file', 'mimetypes:'.implode(',', [...self::IMAGE_TYPES, ...self::VIDEO_TYPES]), 'max:'.self::VIDEO_MAX_KB],
            'bank_name' => ['required', 'string', 'max:100'],
            'bank_account' => ['required', 'regex:/^\d{6,20}$/'],
            'account_name' => ['required', 'string', 'max:100'],
        ];
    }

    /**
     * Ảnh giới hạn chặt hơn video (rule max ở trên là mức của video).
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                foreach ((array) $this->file('media', []) as $index => $file) {
                    if ($file instanceof UploadedFile && in_array($file->getMimeType(), self::IMAGE_TYPES, true) && $file->getSize() > self::IMAGE_MAX_KB * 1024) {
                        $validator->errors()->add("media.{$index}", 'Ảnh tối đa 5 MB.');
                    }
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
            'reason.required' => 'Vui lòng chọn lý do trả hàng.',
            'reason.enum' => 'Lý do trả hàng không hợp lệ.',
            'description.required_if' => 'Vui lòng mô tả lý do trả hàng.',
            'description.max' => 'Mô tả tối đa 1000 ký tự.',
            'items.required' => 'Vui lòng chọn ít nhất 1 sản phẩm cần trả.',
            'items.min' => 'Vui lòng chọn ít nhất 1 sản phẩm cần trả.',
            'items.*.order_item_id.distinct' => 'Sản phẩm bị chọn trùng.',
            'items.*.order_item_id.required' => 'Thiếu sản phẩm cần trả.',
            'items.*.quantity.required' => 'Vui lòng nhập số lượng trả.',
            'items.*.quantity.min' => 'Số lượng trả phải từ 1.',
            'media.required' => 'Vui lòng đính kèm ít nhất 1 ảnh hoặc video làm bằng chứng.',
            'media.min' => 'Vui lòng đính kèm ít nhất 1 ảnh hoặc video làm bằng chứng.',
            'media.max' => 'Tối đa 5 tệp ảnh/video.',
            'media.*.file' => 'Tệp tải lên không hợp lệ.',
            'media.*.mimetypes' => 'Chỉ nhận ảnh jpg, png, webp hoặc video mp4, webm, mov.',
            'media.*.max' => 'Video tối đa 50 MB.',
            'media.*.uploaded' => 'Tải tệp lên thất bại (tệp có thể quá lớn), vui lòng thử lại.',
            'bank_name.required' => 'Vui lòng nhập ngân hàng nhận tiền hoàn.',
            'bank_account.required' => 'Vui lòng nhập số tài khoản nhận tiền hoàn.',
            'bank_account.regex' => 'Số tài khoản chỉ gồm 6–20 chữ số.',
            'account_name.required' => 'Vui lòng nhập tên chủ tài khoản.',
        ];
    }
}

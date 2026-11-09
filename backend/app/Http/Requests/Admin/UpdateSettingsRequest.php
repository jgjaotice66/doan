<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Chủ TK viết IN HOA KHÔNG DẤU — đúng cách ngân hàng hiển thị tên, để khách đối chiếu khi quét QR.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'bank' => ['required', 'string', Rule::in(array_keys(config('shop.banks')))],
            'account' => ['required', 'string', 'regex:/^\d{6,20}$/'],
            'account_name' => ['required', 'string', 'max:50', 'regex:/^[A-Z][A-Z ]*$/'],
            'low_stock_threshold' => ['sometimes', 'required', 'integer', 'min:0', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'bank.required' => 'Vui lòng chọn ngân hàng.',
            'bank.in' => 'Ngân hàng không có trong danh sách hỗ trợ.',
            'account.required' => 'Vui lòng nhập số tài khoản.',
            'account.regex' => 'Số tài khoản chỉ gồm chữ số, dài 6–20 ký tự.',
            'account_name.required' => 'Vui lòng nhập tên chủ tài khoản.',
            'account_name.max' => 'Tên chủ tài khoản tối đa 50 ký tự.',
            'account_name.regex' => 'Tên chủ tài khoản viết IN HOA, không dấu (VD: NGUYEN VAN A).',
            'low_stock_threshold.required' => 'Vui lòng nhập ngưỡng sắp hết hàng.',
            'low_stock_threshold.integer' => 'Ngưỡng phải là số nguyên.',
            'low_stock_threshold.min' => 'Ngưỡng không được âm.',
            'low_stock_threshold.max' => 'Ngưỡng tối đa 1000.',
        ];
    }
}

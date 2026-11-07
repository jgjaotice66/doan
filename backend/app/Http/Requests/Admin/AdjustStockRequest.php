<?php

namespace App\Http\Requests\Admin;

use App\Enums\StockReason;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * import = nhập hàng (chỉ cộng); adjust = điều chỉnh sau kiểm kê/hỏng hóc (cộng hoặc trừ, bắt buộc ghi lý do).
 */
class AdjustStockRequest extends FormRequest
{
    private const MAX = 100000;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $isImport = $this->input('type') === StockReason::Import->value;

        return [
            'type' => ['required', Rule::in([StockReason::Import->value, StockReason::Adjust->value])],
            'quantity' => [
                'required', 'integer',
                $isImport ? 'min:1' : 'min:-'.self::MAX,
                'max:'.self::MAX,
                'not_in:0',
            ],
            'note' => [$isImport ? 'nullable' : 'required', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'type.required' => 'Vui lòng chọn loại thao tác.',
            'type.in' => 'Loại thao tác không hợp lệ.',
            'quantity.required' => 'Vui lòng nhập số lượng.',
            'quantity.integer' => 'Số lượng phải là số nguyên.',
            'quantity.min' => $this->input('type') === StockReason::Import->value
                ? 'Số lượng nhập phải lớn hơn 0.'
                : 'Mỗi lần giảm tối đa '.number_format(self::MAX, 0, ',', '.').'.',
            'quantity.max' => 'Mỗi lần tối đa '.number_format(self::MAX, 0, ',', '.').'.',
            'quantity.not_in' => 'Số lượng phải khác 0.',
            'note.required' => 'Vui lòng ghi lý do điều chỉnh.',
            'note.max' => 'Ghi chú tối đa 255 ký tự.',
        ];
    }

    public function reason(): StockReason
    {
        return StockReason::from($this->validated('type'));
    }
}

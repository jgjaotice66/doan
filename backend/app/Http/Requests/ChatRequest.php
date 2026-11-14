<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Một tin nhắn gửi chatbot. `context` là bộ lọc bot trả về ở lần trước, frontend gửi lại nguyên vẹn.
 */
class ChatRequest extends FormRequest
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
            'message' => ['required', 'string', 'max:500'],
            'context' => ['nullable', 'array'],
            'context.q' => ['nullable', 'string', 'max:100'],
            'context.category' => ['nullable', 'string', 'max:255'],
            'context.brand' => ['nullable', 'string', 'max:255'],
            'context.min_age' => ['nullable', 'integer', 'min:0', 'max:99'],
            'context.price_min' => ['nullable', 'integer', 'min:0'],
            'context.price_max' => ['nullable', 'integer', 'min:0'],
            'context.sort' => ['nullable', Rule::in(ProductIndexRequest::SORTS)],
            'context.min_shown' => ['nullable', 'integer', 'min:1'],
            'context.max_shown' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * Chỉ giữ các khoá đã validate.
     *
     * @return array<string, mixed>
     */
    public function chatContext(): array
    {
        return $this->validated('context') ?? [];
    }
}

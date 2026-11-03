<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductIndexRequest extends FormRequest
{
    public const SORTS = ['newest', 'price_asc', 'price_desc', 'best_selling'];

    public const DEFAULT_PER_PAGE = 12;

    public const MAX_PER_PAGE = 48;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * `brand=bandai,tamiya` → ['bandai', 'tamiya'] để dễ đồng bộ lên URL.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->brand)) {
            $this->merge([
                'brand' => array_values(array_filter(array_map('trim', explode(',', $this->brand)))),
            ]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:255'],
            'brand' => ['nullable', 'array'],
            'brand.*' => ['string', 'max:255'],
            'min_age' => ['nullable', 'integer', Rule::in(Product::AGE_GROUPS)],
            'price_min' => ['nullable', 'integer', 'min:0'],
            'price_max' => ['nullable', 'integer', 'min:0'],
            'featured' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(self::SORTS)],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * Số sản phẩm mỗi trang, tối đa 48.
     */
    public function perPage(): int
    {
        return min($this->integer('per_page', self::DEFAULT_PER_PAGE), self::MAX_PER_PAGE);
    }
}

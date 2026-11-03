<?php

namespace App\Http\Resources;

use App\Services\CartService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bọc kết quả CartService::summary().
 */
class CartResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array<string, mixed> $cart see CartService::summary() */
        $cart = $this->resource;

        return [
            'items' => CartItemResource::collection($cart['items']),
            'count' => $cart['count'],
            'subtotal' => $cart['subtotal'],
            'shipping_fee' => $cart['shipping_fee'],
            'total' => $cart['total'],
            'has_unavailable' => $cart['has_unavailable'],
        ];
    }
}

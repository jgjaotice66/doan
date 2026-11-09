<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReturnRequest;
use App\Http\Resources\ReturnRequestResource;
use App\Services\ReturnService;
use Illuminate\Http\JsonResponse;

/**
 * Khách gửi yêu cầu trả hàng cho đơn của mình (xem tiến độ trong GET /orders/{code}).
 */
class ReturnController extends Controller
{
    public function __construct(private ReturnService $returns) {}

    public function store(StoreReturnRequest $request, string $code): JsonResponse
    {
        // Chỉ tìm trong đơn của chính mình → đơn người khác trả 404.
        $order = $request->user()->orders()->where('code', $code)->firstOrFail();

        $return = $this->returns->create($order, $request->user(), $request->validated(), $request->file('media', []));

        return (new ReturnRequestResource($return->load(['order', 'items.orderItem.product.images', 'media'])))
            ->response()
            ->setStatusCode(201);
    }
}

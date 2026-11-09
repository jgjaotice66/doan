<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ReturnStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminReturnRequestResource;
use App\Models\ReturnRequest;
use App\Services\ReturnService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Admin xử lý yêu cầu trả hàng; quy tắc chuyển bước nằm ở ReturnService.
 */
class ReturnController extends Controller
{
    private const WITH = ['order', 'user', 'items.orderItem.product.images', 'media'];

    public function __construct(private ReturnService $returns) {}

    /**
     * Lọc: status, q = mã đơn. Mới nhất trước.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::enum(ReturnStatus::class)],
            'q' => ['nullable', 'string', 'max:50'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $returns = ReturnRequest::query()
            ->with(['order', 'user', 'items.orderItem'])
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($validated['q'] ?? null, fn ($query, $q) => $query->whereHas('order', fn ($order) => $order->where('code', 'like', "%{$q}%")))
            ->latest()
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 10);

        return AdminReturnRequestResource::collection($returns);
    }

    public function show(ReturnRequest $returnRequest): AdminReturnRequestResource
    {
        return $this->resource($returnRequest);
    }

    public function approve(Request $request, ReturnRequest $returnRequest): AdminReturnRequestResource
    {
        $validated = $request->validate(['admin_note' => ['nullable', 'string', 'max:1000']]);

        return $this->resource($this->returns->approve($returnRequest, $validated['admin_note'] ?? null));
    }

    public function reject(Request $request, ReturnRequest $returnRequest): AdminReturnRequestResource
    {
        $validated = $request->validate(
            ['admin_note' => ['required', 'string', 'max:1000']],
            ['admin_note.required' => 'Vui lòng ghi lý do từ chối để khách biết.'],
        );

        return $this->resource($this->returns->reject($returnRequest, $validated['admin_note']));
    }

    /**
     * items: [{ id (dòng của yêu cầu), restock: bool }] — món nào nhập lại kho.
     */
    public function receive(Request $request, ReturnRequest $returnRequest): AdminReturnRequestResource
    {
        $validated = $request->validate([
            'items' => ['nullable', 'array'],
            'items.*.id' => ['required', 'integer', 'distinct'],
            'items.*.restock' => ['nullable', 'boolean'],
        ]);

        return $this->resource($this->returns->receive($returnRequest, $request->user(), $validated['items'] ?? []));
    }

    public function refund(Request $request, ReturnRequest $returnRequest): AdminReturnRequestResource
    {
        $validated = $request->validate(
            ['refund_amount' => ['nullable', 'integer']],
            ['refund_amount.integer' => 'Số tiền hoàn phải là số nguyên.'],
        );

        return $this->resource($this->returns->refund($returnRequest, $validated['refund_amount'] ?? null));
    }

    private function resource(ReturnRequest $returnRequest): AdminReturnRequestResource
    {
        return new AdminReturnRequestResource($returnRequest->load(self::WITH));
    }
}

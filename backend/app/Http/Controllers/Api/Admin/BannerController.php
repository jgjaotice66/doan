<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BannerRequest;
use App\Http\Resources\AdminBannerResource;
use App\Models\Banner;
use App\Support\Media;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Quản trị banner slider trang chủ. Ảnh gửi multipart; sửa có ảnh thì POST kèm _method=PUT.
 * Danh sách ít (vài cái) → không phân trang.
 */
class BannerController extends Controller
{
    private const IMAGE_DIR = 'banners';

    public function index(): AnonymousResourceCollection
    {
        return AdminBannerResource::collection($this->ordered());
    }

    /**
     * Banner mới xếp cuối slider.
     */
    public function store(BannerRequest $request): JsonResponse
    {
        $banner = Media::swap(null, $request->file('image'), false, self::IMAGE_DIR, fn (?string $image) => Banner::create([
            ...$this->fields($request),
            'image' => $image,
            'sort_order' => (int) Banner::max('sort_order') + (Banner::exists() ? 1 : 0),
        ]));

        return (new AdminBannerResource($banner))->response()->setStatusCode(201);
    }

    /**
     * Không gửi ảnh → giữ ảnh cũ; gửi ảnh mới → lưu mới, ghi DB rồi mới xoá ảnh cũ.
     */
    public function update(BannerRequest $request, Banner $banner): AdminBannerResource
    {
        Media::swap($banner->image, $request->file('image'), false, self::IMAGE_DIR, fn (?string $image) => $banner->update([
            ...$this->fields($request),
            'image' => $image,
        ]));

        return new AdminBannerResource($banner);
    }

    public function toggleActive(Banner $banner): AdminBannerResource
    {
        $banner->update(['is_active' => ! $banner->is_active]);

        return new AdminBannerResource($banner);
    }

    /**
     * ids = toàn bộ id banner theo thứ tự mới (cái đầu hiện trước trên slider).
     */
    public function reorder(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        // Phải đúng y tập banner hiện có: không thiếu, không thừa, không trùng.
        $sent = array_map('intval', $validated['ids']);
        $allIds = Banner::pluck('id')->sort()->values()->all();
        $sorted = $sent;
        sort($sorted);
        if ($sorted !== $allIds) {
            throw ValidationException::withMessages([
                'ids' => 'Danh sách banner đã thay đổi (vừa thêm hoặc xoá) — hãy tải lại trang rồi sắp xếp lại.',
            ]);
        }

        DB::transaction(function () use ($sent) {
            foreach ($sent as $order => $id) {
                Banner::whereKey($id)->update(['sort_order' => $order]);
            }
        });

        return AdminBannerResource::collection($this->ordered());
    }

    public function destroy(Banner $banner): Response
    {
        $banner->delete();
        Media::delete($banner->image);

        return response()->noContent();
    }

    /**
     * @return array{title: string, link: ?string, is_active: bool}
     */
    private function fields(BannerRequest $request): array
    {
        return [
            'title' => $request->validated('title'),
            'link' => $request->validated('link') ?: null,
            'is_active' => $request->boolean('is_active', true),
        ];
    }

    /**
     * @return Collection<int, Banner>
     */
    private function ordered()
    {
        return Banner::orderBy('sort_order')->orderBy('id')->get();
    }
}

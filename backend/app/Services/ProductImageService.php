<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductImage;
use App\Support\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProductImageService
{
    private const DIRECTORY = 'products';

    /**
     * Thêm ảnh vào cuối danh sách. Lưu hết file trước rồi mới ghi DB;
     * ghi DB lỗi thì xoá các file vừa lưu (không để file mồ côi).
     *
     * @param  list<UploadedFile>  $files
     * @return Collection<int, ProductImage>
     */
    public function attach(Product $product, array $files): Collection
    {
        $paths = [];

        try {
            foreach ($files as $file) {
                $paths[] = Media::store($file, self::DIRECTORY);
            }

            return DB::transaction(function () use ($product, $paths) {
                $next = ($product->images()->max('sort_order') ?? -1) + 1;

                return collect($paths)->map(fn (string $path, int $i) => $product->images()->create([
                    'path' => $path,
                    'sort_order' => $next + $i,
                ]));
            });
        } catch (Throwable $e) {
            array_walk($paths, fn (string $path) => Media::delete($path));

            throw $e;
        }
    }

    /**
     * Xoá ảnh: xoá dòng DB trước, xong mới xoá file.
     */
    public function delete(ProductImage $image): void
    {
        $image->delete();
        Media::delete($image->path);
    }

    /**
     * Sắp xếp lại theo thứ tự id truyền vào (ảnh đầu tiên = ảnh đại diện).
     *
     * @param  list<int>  $ids
     */
    public function reorder(Product $product, array $ids): void
    {
        DB::transaction(function () use ($product, $ids) {
            foreach ($ids as $order => $id) {
                $product->images()->whereKey($id)->update(['sort_order' => $order]);
            }
        });
    }
}

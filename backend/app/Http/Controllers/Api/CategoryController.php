<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryController extends Controller
{
    /**
     * Cây danh mục: danh mục gốc kèm danh mục con, mỗi nút có số sản phẩm đang bán.
     */
    public function index(): AnonymousResourceCollection
    {
        $countActive = ['products' => fn ($query) => $query->active()];

        $categories = Category::query()
            ->whereNull('parent_id')
            ->withCount($countActive)
            ->with(['children' => fn ($query) => $query->withCount($countActive)->orderBy('name')])
            ->orderBy('name')
            ->get();

        return CategoryResource::collection($categories);
    }
}

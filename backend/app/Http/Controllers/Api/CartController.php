<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cart\StoreCartItemRequest;
use App\Http\Requests\Cart\UpdateCartItemRequest;
use App\Http\Resources\CartResource;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use App\Services\CartService;
use Illuminate\Http\Request;

/**
 * Giỏ hàng của người đang đăng nhập. Mọi thao tác đều trả về toàn bộ giỏ mới.
 */
class CartController extends Controller
{
    public function __construct(private CartService $cart) {}

    public function index(Request $request): CartResource
    {
        return $this->respond($request->user());
    }

    public function store(StoreCartItemRequest $request): CartResource
    {
        $product = Product::findOrFail($request->integer('product_id'));

        $this->cart->add($request->user(), $product, $request->integer('quantity'));

        return $this->respond($request->user());
    }

    public function update(UpdateCartItemRequest $request, int $id): CartResource
    {
        $this->cart->updateQuantity($this->findOwnItem($request->user(), $id), $request->integer('quantity'));

        return $this->respond($request->user());
    }

    public function destroy(Request $request, int $id): CartResource
    {
        $this->findOwnItem($request->user(), $id)->delete();

        return $this->respond($request->user());
    }

    /**
     * Chỉ tìm trong giỏ của chính mình → dòng của người khác trả 404.
     */
    private function findOwnItem(User $user, int $id): CartItem
    {
        return $user->cartItems()->findOrFail($id);
    }

    private function respond(User $user): CartResource
    {
        return new CartResource($this->cart->summary($user));
    }
}

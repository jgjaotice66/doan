<?php

namespace Tests\Feature\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManageTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['name' => 'Admin', 'created_at' => now()->subYear()]);
    }

    // ---------- Danh sách ----------

    public function test_lists_users_with_order_count_and_total_spent(): void
    {
        Sanctum::actingAs($this->admin);
        $customer = User::factory()->create(['created_at' => now()]);
        Order::factory()->for($customer)->paid()->create(['total' => 500000, 'status' => OrderStatus::Completed]);
        Order::factory()->for($customer)->paid()->create(['total' => 200000, 'status' => OrderStatus::Confirmed]);
        // Không tính vào chi tiêu: chưa trả / đã huỷ (dù đã trả) / đã hoàn tiền.
        Order::factory()->for($customer)->create(['total' => 900000]);
        Order::factory()->for($customer)->paid()->create(['total' => 300000, 'status' => OrderStatus::Cancelled]);
        Order::factory()->for($customer)->create([
            'total' => 400000, 'status' => OrderStatus::Cancelled, 'payment_status' => PaymentStatus::Refunded,
        ]);

        $this->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonPath('data.0.id', $customer->id)
            ->assertJsonPath('data.0.orders_count', 5)
            ->assertJsonPath('data.0.total_spent', 700000)
            ->assertJsonPath('data.0.role', ['value' => 'customer', 'label' => 'Khách hàng'])
            ->assertJsonPath('data.1.id', $this->admin->id)
            ->assertJsonPath('data.1.orders_count', 0)
            ->assertJsonPath('data.1.total_spent', 0)
            ->assertJsonPath('data.1.is_self', true)
            ->assertJsonPath('data.0.is_self', false);
    }

    public function test_search_and_filters(): void
    {
        Sanctum::actingAs($this->admin);
        $an = User::factory()->create(['name' => 'Nguyễn Qwzy An', 'email' => 'an@example.com', 'phone' => '0901111222']);
        $locked = User::factory()->create(['name' => 'Bị Khoá', 'is_active' => false]);

        $this->getJson('/api/v1/admin/users?q=qwzy an')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $an->id);
        $this->getJson('/api/v1/admin/users?q=an@example')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/admin/users?q=1111222')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/admin/users?role=admin')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $this->admin->id);
        $this->getJson('/api/v1/admin/users?is_active=0')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $locked->id);
        $this->getJson('/api/v1/admin/users?role=boss&sort=age')->assertJsonValidationErrors(['role', 'sort']);
    }

    public function test_sort_by_spending_and_order_count(): void
    {
        Sanctum::actingAs($this->admin);
        $big = User::factory()->create();
        $many = User::factory()->create();
        Order::factory()->for($big)->paid()->create(['total' => 5000000]);
        Order::factory()->count(3)->for($many)->paid()->create(['total' => 100000]);

        $this->getJson('/api/v1/admin/users?sort=top_spent')->assertJsonPath('data.0.id', $big->id);
        $this->getJson('/api/v1/admin/users?sort=most_orders')->assertJsonPath('data.0.id', $many->id);
    }

    // ---------- Khoá / mở khoá ----------

    public function test_locking_user_revokes_tokens_and_blocks_login(): void
    {
        $customer = User::factory()->create(['email' => 'khach@example.com', 'password' => 'password']);
        $oldToken = $customer->createToken('web')->plainTextToken;

        Sanctum::actingAs($this->admin);
        $this->patchJson("/api/v1/admin/users/{$customer->id}/toggle-active")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertFalse($customer->fresh()->is_active);
        $this->assertSame(0, $customer->tokens()->count());

        // Token cũ không dùng được nữa.
        $this->app['auth']->forgetGuards();
        $this->withToken($oldToken)->getJson('/api/v1/me')->assertUnauthorized();

        // Đăng nhập lại → 403.
        $this->app['auth']->forgetGuards();
        $this->withoutToken()
            ->postJson('/api/v1/auth/login', ['email' => 'khach@example.com', 'password' => 'password'])
            ->assertForbidden();
    }

    public function test_unlocking_user_lets_them_log_in_again(): void
    {
        $customer = User::factory()->create(['email' => 'khach@example.com', 'password' => 'password', 'is_active' => false]);

        Sanctum::actingAs($this->admin);
        $this->patchJson("/api/v1/admin/users/{$customer->id}/toggle-active")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/v1/auth/login', ['email' => 'khach@example.com', 'password' => 'password'])->assertOk();
    }

    public function test_admin_cannot_lock_themselves(): void
    {
        Sanctum::actingAs($this->admin);

        $this->patchJson("/api/v1/admin/users/{$this->admin->id}/toggle-active")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user' => 'Bạn không thể tự khoá tài khoản của chính mình.']);

        $this->assertTrue($this->admin->fresh()->is_active);
    }

    // ---------- Xem đơn của 1 người ----------

    public function test_admin_orders_can_be_filtered_by_user(): void
    {
        Sanctum::actingAs($this->admin);
        $customer = User::factory()->create();
        $mine = Order::factory()->for($customer)->create();
        Order::factory()->create();

        $this->getJson("/api/v1/admin/orders?user={$customer->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);
    }

    public function test_customer_gets_403(): void
    {
        $other = User::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->patchJson("/api/v1/admin/users/{$other->id}/toggle-active")->assertForbidden();
        $this->assertTrue($other->fresh()->is_active);
    }
}

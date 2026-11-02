<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_gets_401_on_admin_routes(): void
    {
        $this->getJson('/api/v1/admin/ping')->assertUnauthorized();
    }

    public function test_customer_gets_403_on_admin_routes(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/ping')
            ->assertForbidden()
            ->assertJsonStructure(['message']);
    }

    public function test_admin_can_access_admin_routes(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/v1/admin/ping')
            ->assertOk()
            ->assertExactJson(['status' => 'ok', 'scope' => 'admin']);
    }

    public function test_locked_user_with_existing_token_is_blocked(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $user->forceFill(['is_active' => false])->save();

        $this->withToken($token)->getJson('/api/v1/me')
            ->assertForbidden()
            ->assertJsonPath('message', 'Tài khoản đã bị khoá');
    }

    public function test_locked_admin_is_blocked_from_admin_routes(): void
    {
        Sanctum::actingAs(User::factory()->admin()->inactive()->create());

        $this->getJson('/api/v1/admin/ping')->assertForbidden();
    }
}

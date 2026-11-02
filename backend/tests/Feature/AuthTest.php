<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function registerPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Nguyễn Văn A',
            'email' => 'a@example.com',
            'phone' => '0901234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], $overrides);
    }

    public function test_user_can_register_and_receives_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->registerPayload());

        $response->assertCreated()
            ->assertJsonStructure(['user' => ['id', 'name', 'email', 'phone', 'role'], 'token'])
            ->assertJsonPath('user.email', 'a@example.com')
            ->assertJsonPath('user.role', 'customer')
            ->assertJsonMissingPath('user.password');

        $user = User::where('email', 'a@example.com')->firstOrFail();
        $this->assertSame(UserRole::Customer, $user->role);
        $this->assertTrue(Hash::check('password123', $user->password));
    }

    public function test_register_cannot_set_admin_role(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registerPayload(['role' => 'admin']))
            ->assertCreated()
            ->assertJsonPath('user.role', 'customer');
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'a@example.com']);

        $this->postJson('/api/v1/auth/register', $this->registerPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Email này đã được đăng ký.']);
    }

    public function test_register_requires_password_confirmation(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registerPayload(['password_confirmation' => 'khac']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    public function test_user_can_login_with_correct_credentials(): void
    {
        $user = User::factory()->create(['email' => 'a@example.com']);

        $this->postJson('/api/v1/auth/login', ['email' => 'a@example.com', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonStructure(['token']);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create(['email' => 'a@example.com']);

        $this->postJson('/api/v1/auth/login', ['email' => 'a@example.com', 'password' => 'sai-mat-khau'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::factory()->inactive()->create(['email' => 'a@example.com']);

        $this->postJson('/api/v1/auth/login', ['email' => 'a@example.com', 'password' => 'password'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Tài khoản đã bị khoá');
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->assertSame(0, $user->tokens()->count());

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_guest_cannot_access_profile(): void
    {
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_user_can_view_and_update_profile(): void
    {
        $user = User::factory()->create(['name' => 'Cũ']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);

        $this->withToken($token)->putJson('/api/v1/me', [
            'name' => 'Mới',
            'phone' => '0909999999',
            'email' => 'doi-email@example.com',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Mới')
            ->assertJsonPath('data.phone', '0909999999');

        $user->refresh();
        $this->assertSame('Mới', $user->name);
        $this->assertNotSame('doi-email@example.com', $user->email);
    }

    public function test_user_can_change_password(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/me/password', [
            'current_password' => 'password',
            'password' => 'matkhaumoi123',
            'password_confirmation' => 'matkhaumoi123',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('matkhaumoi123', $user->refresh()->password));
    }

    public function test_change_password_rejects_wrong_current_password(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/me/password', [
            'current_password' => 'sai',
            'password' => 'matkhaumoi123',
            'password_confirmation' => 'matkhaumoi123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password']);

        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResetDemoCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_refuses_to_run_in_production(): void
    {
        $this->app['env'] = 'production';
        $user = User::factory()->create();

        $this->artisan('app:reset-demo', ['--force' => true])
            ->expectsOutputToContain('production')
            ->assertFailed();

        $this->assertModelExists($user);
    }

    public function test_does_nothing_when_not_confirmed(): void
    {
        $user = User::factory()->create();

        $this->artisan('app:reset-demo')
            ->expectsConfirmation('Xoá TOÀN BỘ dữ liệu hiện tại và nạp lại dữ liệu demo?', 'no')
            ->expectsOutputToContain('Đã huỷ')
            ->assertSuccessful();

        $this->assertModelExists($user);
    }
}

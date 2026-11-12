<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class HotlineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['shop.hotline' => '', 'shop.return_days' => 10]);
    }

    public function test_public_shop_info_is_empty_when_no_hotline_is_set(): void
    {
        $this->getJson('/api/v1/shop')
            ->assertOk()
            ->assertExactJson(['data' => ['hotline' => null, 'return_days' => 10]]);
    }

    public function test_public_shop_info_exposes_return_window_from_config(): void
    {
        config(['shop.return_days' => 14]);

        $this->getJson('/api/v1/shop')->assertJsonPath('data.return_days', 14);
    }

    public function test_public_shop_info_falls_back_to_env_config(): void
    {
        config(['shop.hotline' => '19001234']);

        $this->getJson('/api/v1/shop')->assertJsonPath('data.hotline', '19001234');
    }

    public function test_admin_saves_hotline_and_storefront_sees_it(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->putJson('/api/v1/admin/settings/hotline', ['hotline' => '0901 234 567'])
            ->assertOk()
            ->assertJsonPath('data.hotline', '0901234567');

        $this->getJson('/api/v1/admin/settings')->assertJsonPath('data.hotline', '0901234567');
        $this->getJson('/api/v1/shop')->assertJsonPath('data.hotline', '0901234567');
    }

    public function test_admin_clears_hotline_to_hide_the_button(): void
    {
        config(['shop.hotline' => '19001234']);
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->putJson('/api/v1/admin/settings/hotline', ['hotline' => '0901234567'])->assertOk();
        $this->putJson('/api/v1/admin/settings/hotline', ['hotline' => null])
            ->assertOk()
            ->assertJsonPath('data.hotline', null);

        $this->getJson('/api/v1/shop')->assertJsonPath('data.hotline', null);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function validNumbers(): array
    {
        return [
            'di động' => ['0901234567'],
            'cố định 11 số' => ['02838123456'],
            'tổng đài 1900' => ['19001234'],
            'tổng đài 1800' => ['18006789'],
        ];
    }

    #[DataProvider('validNumbers')]
    public function test_accepts_common_vietnamese_numbers(string $hotline): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->putJson('/api/v1/admin/settings/hotline', ['hotline' => $hotline])->assertOk();
    }

    /**
     * @return array<string, array{string}>
     */
    public static function invalidNumbers(): array
    {
        return [
            'có chữ' => ['0901abc567'],
            'quá ngắn' => ['090123'],
            'không bắt đầu bằng 0 hay 1800/1900' => ['5901234567'],
            'quá dài' => ['090123456789'],
        ];
    }

    #[DataProvider('invalidNumbers')]
    public function test_rejects_invalid_numbers(string $hotline): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->putJson('/api/v1/admin/settings/hotline', ['hotline' => $hotline])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('hotline');

        $this->assertDatabaseCount('settings', 0);
    }

    public function test_customer_cannot_change_hotline(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->putJson('/api/v1/admin/settings/hotline', ['hotline' => '0901234567'])->assertForbidden();
        $this->assertDatabaseCount('settings', 0);
    }
}

<?php

namespace Tests\Feature\Admin;

use App\Enums\PaymentMethod;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SettingTest extends TestCase
{
    use RefreshDatabase;

    private const VALID = ['bank' => 'VCB', 'account' => '1234567890', 'account_name' => 'TRAN THI B'];

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'shop.vietqr.bank' => 'MB',
            'shop.vietqr.account' => '0000000000',
            'shop.vietqr.account_name' => 'NGUYEN VAN A',
        ]);
    }

    private function actingAsAdmin(): User
    {
        return Sanctum::actingAs(User::factory()->admin()->create());
    }

    public function test_falls_back_to_env_config_when_nothing_saved(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/v1/admin/settings')
            ->assertOk()
            ->assertJsonPath('data.bank', 'MB')
            ->assertJsonPath('data.account', '0000000000')
            ->assertJsonPath('data.account_name', 'NGUYEN VAN A')
            ->assertJsonFragment(['code' => 'VCB', 'name' => 'Vietcombank']);
    }

    public function test_admin_updates_bank_account(): void
    {
        $this->actingAsAdmin();

        $this->putJson('/api/v1/admin/settings', self::VALID)
            ->assertOk()
            ->assertJsonPath('data.bank', 'VCB')
            ->assertJsonPath('data.account', '1234567890')
            ->assertJsonPath('data.account_name', 'TRAN THI B');

        $this->getJson('/api/v1/admin/settings')->assertJsonPath('data.account', '1234567890');
        $this->assertDatabaseHas('settings', ['key' => 'vietqr.account', 'value' => '1234567890']);
    }

    public function test_unpaid_order_qr_uses_the_new_account_immediately(): void
    {
        $customer = User::factory()->create();
        $order = Order::factory()->for($customer)->create(['payment_method' => PaymentMethod::BankQr]);

        $this->actingAsAdmin();
        $this->putJson('/api/v1/admin/settings', self::VALID)->assertOk();

        Sanctum::actingAs($customer);
        $response = $this->getJson("/api/v1/orders/{$order->code}")
            ->assertOk()
            ->assertJsonPath('data.bank', [...self::VALID, 'bank_name' => 'Vietcombank']);

        $this->assertStringContainsString('/VCB-1234567890-', $response->json('data.qr_url'));
        $this->assertStringContainsString('accountName=TRAN+THI+B', $response->json('data.qr_url'));
    }

    /**
     * @return array<string, array{array<string, string>, string}>
     */
    public static function invalidPayloads(): array
    {
        return [
            'thiếu ngân hàng' => [['bank' => ''], 'bank'],
            'ngân hàng lạ' => [['bank' => 'XYZ'], 'bank'],
            'số TK có chữ' => [['account' => '12345abc'], 'account'],
            'số TK quá ngắn' => [['account' => '12345'], 'account'],
            'số TK quá dài' => [['account' => str_repeat('1', 21)], 'account'],
            'chủ TK có dấu' => [['account_name' => 'TRẦN THỊ B'], 'account_name'],
            'chủ TK chữ thường' => [['account_name' => 'Tran Thi B'], 'account_name'],
            'thiếu chủ TK' => [['account_name' => ''], 'account_name'],
        ];
    }

    /**
     * @param  array<string, string>  $override
     */
    #[DataProvider('invalidPayloads')]
    public function test_validation(array $override, string $field): void
    {
        $this->actingAsAdmin();

        $this->putJson('/api/v1/admin/settings', [...self::VALID, ...$override])
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);

        $this->assertDatabaseCount('settings', 0);
    }

    public function test_customer_gets_403(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/settings')->assertForbidden();
        $this->putJson('/api/v1/admin/settings', self::VALID)->assertForbidden();
        $this->assertDatabaseCount('settings', 0);
    }
}

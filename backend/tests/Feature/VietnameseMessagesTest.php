<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VietnameseMessagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_validation_messages_are_vietnamese(): void
    {
        app()->setLocale('vi');

        $this->getJson('/api/v1/products?per_page=abc&price_min=x')
            ->assertUnprocessable()
            ->assertJsonPath('errors.per_page.0', 'Số mục mỗi trang phải là số nguyên.')
            ->assertJsonPath('message', 'Giá từ phải là số nguyên. (và 1 lỗi khác)');
    }

    public function test_too_many_attempts_message_is_vietnamese(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'x@y.z', 'password' => 'sai']);
        }

        $this->postJson('/api/v1/auth/login', ['email' => 'x@y.z', 'password' => 'sai'])
            ->assertTooManyRequests()
            ->assertExactJson(['message' => 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.']);
    }
}

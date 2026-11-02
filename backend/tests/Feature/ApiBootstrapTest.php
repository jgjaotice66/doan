<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiBootstrapTest extends TestCase
{
    public function test_ping_returns_ok(): void
    {
        $this->getJson('/api/v1/ping')
            ->assertOk()
            ->assertExactJson(['status' => 'ok']);
    }

    public function test_unknown_api_route_returns_json_404(): void
    {
        $this->get('/api/v1/khong-ton-tai')
            ->assertNotFound()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonStructure(['message']);
    }

    public function test_cors_allows_frontend_origin(): void
    {
        $this->withHeaders([
            'Origin' => config('shop.frontend_url'),
            'Access-Control-Request-Method' => 'GET',
        ])->options('/api/v1/ping')
            ->assertHeader('Access-Control-Allow-Origin', config('shop.frontend_url'));
    }
}

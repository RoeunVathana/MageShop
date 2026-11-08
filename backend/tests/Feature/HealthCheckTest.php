<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    /**
     * Test the basic health check endpoint.
     */
    public function test_health_check_returns_ok_and_application_name(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertExactJson([
                'status' => 'ok',
                'application' => 'MegaCommerce API',
            ]);
    }

    /**
     * Test the detailed readiness health check.
     */
    public function test_readiness_health_check_verifies_database(): void
    {
        $response = $this->getJson('/api/v1/health/ready');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('application', 'MegaCommerce API')
            ->assertJsonPath('dependencies.database.status', 'healthy');
    }

    /**
     * Test non-existent API route returns structured 404 error.
     */
    public function test_api_404_returns_structured_error_response(): void
    {
        $response = $this->getJson('/api/v1/non-existent-route-for-testing');

        $response->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'message' => 'The requested resource or endpoint was not found.',
            ]);
    }
}

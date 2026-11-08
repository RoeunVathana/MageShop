<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeadersMiddleware
{
    /**
     * Apply OWASP ASVS security headers and block malicious query patterns.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Inspect raw query string for path traversal or obvious injection probes
        $rawQuery = urldecode((string) $request->getQueryString());
        if (
            str_contains($rawQuery, '../') ||
            str_contains($rawQuery, '..\\') ||
            preg_match('/(union\s+all\s+select|<script\b[^>]*>)/i', $rawQuery)
        ) {
            return response()->json([
                'status' => 'error',
                'message' => 'Malicious request signature blocked by MegaCommerce WAF.',
            ], 400);
        }

        /** @var Response $response */
        $response = $next($request);

        // Remove server fingerprinting headers
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');

        // Enforce OWASP security headers
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self' https: data: blob: 'unsafe-inline'; frame-ancestors 'self' https://web.telegram.org;"
        );

        return $response;
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeadersMiddleware
{
    /**
     * Apply OWASP ASVS Level 2 security headers and WAF request inspection.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Inspect raw query string & URI for path traversal, null bytes, SQLi, and XSS probes
        $rawQuery = urldecode((string) $request->getQueryString());
        if (
            str_contains($rawQuery, '../') ||
            str_contains($rawQuery, '..\\') ||
            str_contains($rawQuery, "\0") ||
            preg_match('/(union\s+(all\s+)?select|sleep\s*\(\s*\d+\s*\)|benchmark\s*\(|<script\b[^>]*>|javascript\s*:)/i', $rawQuery)
        ) {
            return response()->json([
                'status' => 'error',
                'message' => 'Malicious request signature blocked by MegaCommerce WAF.',
            ], 400);
        }

        /** @var Response $response */
        $response = $next($request);

        // 2. Strip server fingerprinting headers
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');

        // 3. Enforce strict OWASP ASVS HTTP response headers
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), magnetometer=()'
        );
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self' https: data: blob: 'unsafe-inline'; frame-ancestors 'self' https://web.telegram.org;"
        );

        return $response;
    }
}

<?php

namespace App\Http\Middleware;

use App\Services\Security\SecurityLogService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeadersMiddleware
{
    /**
     * Apply OWASP ASVS Level 3 security headers, scanner blocking, and WAF request inspection.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Block dangerous HTTP methods (Cross-Site Tracing / XST prevention)
        $method = strtoupper($request->getMethod());
        if (in_array($method, ['TRACE', 'TRACK', 'CONNECT'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'HTTP method not allowed by MegaCommerce WAF.',
            ], 405);
        }

        // 2. Block automated offensive vulnerability scanners by User-Agent signature
        $userAgent = strtolower((string) $request->userAgent());
        if (
            $userAgent !== '' &&
            preg_match('/(sqlmap|nikto|acunetix|nessus|masscan|zgrab|nuclei|dirbuster|gobuster|wpscan|havij|netsparker)/i', $userAgent)
        ) {
            SecurityLogService::log('WAF_SCANNER_BLOCKED', null, [
                'user_agent' => substr($userAgent, 0, 160),
                'path' => $request->path(),
            ], 'warning');

            return response()->json([
                'status' => 'error',
                'message' => 'Automated security scanner blocked by MegaCommerce WAF.',
            ], 403);
        }

        // 3. Protect against oversized JSON payload memory exhaustion (max 2MB for non-multipart requests)
        $contentType = strtolower((string) $request->header('Content-Type', ''));
        $contentLength = (int) $request->header('Content-Length', 0);
        if ($contentLength > 2097152 && ! str_contains($contentType, 'multipart/form-data')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Request payload exceeds maximum allowed size (2MB).',
            ], 413);
        }

        // 4. Inspect raw query string & URI for path traversal, null bytes, SQLi, XSS, SSRF wrappers & JNDI
        $rawQuery = urldecode((string) $request->getQueryString());
        $rawUri = urldecode((string) $request->getRequestUri());
        $inspectionTarget = $rawQuery.' '.$rawUri;

        if (
            str_contains($inspectionTarget, '../') ||
            str_contains($inspectionTarget, '..\\') ||
            str_contains($inspectionTarget, "\0") ||
            preg_match(
                '/(union\s+(all\s+)?select|sleep\s*\(\s*\d+\s*\)|pg_sleep\s*\(|waitfor\s+delay|benchmark\s*\(|<script\b[^>]*>|javascript\s*:|onerror\s*=|onload\s*=|(php|phar|expect|gopher|dict):\/\/|\$\{jndi:)/i',
                $inspectionTarget
            )
        ) {
            return response()->json([
                'status' => 'error',
                'message' => 'Malicious request signature blocked by MegaCommerce WAF.',
            ], 400);
        }

        /** @var Response $response */
        $response = $next($request);

        // 5. Strip server fingerprinting headers
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');

        // 6. Attach forensic request correlation ID
        $requestId = $request->header('X-Request-ID') ?: (string) Str::uuid();
        $response->headers->set('X-Request-ID', $requestId);

        // 7. Enforce strict OWASP ASVS Level 3 HTTP response headers
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');
        $response->headers->set('X-DNS-Prefetch-Control', 'off');
        $response->headers->set('X-Download-Options', 'noopen');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        $response->headers->set('Cross-Origin-Resource-Policy', 'cross-origin');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set(
            'Permissions-Policy',
            'accelerometer=(), autoplay=(self), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(self), picture-in-picture=(self), publickey-credentials-get=(self), sync-xhr=(), usb=(), xr-spatial-tracking=()'
        );
        $response->headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self' https: data: blob: 'unsafe-inline'; frame-ancestors 'self' https://web.telegram.org; base-uri 'self'; form-action 'self';"
        );

        // 8. Prevent proxy/browser caching of sensitive authentication and admin responses
        if ($request->is('api/v1/auth/*', 'api/v1/admin/*', 'api/v1/user')) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, private');
            $response->headers->set('Pragma', 'no-cache');
        }

        return $response;
    }
}

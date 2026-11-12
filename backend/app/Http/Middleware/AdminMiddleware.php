<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protect platform administration endpoints with a server-side role check.
 *
 * UI route guards are useful for navigation, but they are not an authorization
 * boundary. Every endpoint that changes platform-wide data must pass this
 * middleware before the controller is allowed to run.
 */
class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('sanctum') ?? $request->user();

        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated. Administrator session required.',
            ], 401);
        }

        if (! $user->hasRole(['SUPER_ADMIN', 'ADMIN'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden. Administrator privileges are required.',
            ], 403);
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    /**
     * Strictly allowed media extensions for public streaming and cloud uploads.
     *
     * @var array<int, string>
     */
    private const ALLOWED_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico', 'avif',
        'mp4', 'webm', 'mov',
        'pdf', 'doc', 'docx', 'xlsx', 'csv',
    ];

    /**
     * Resolve and serve or redirect to media stored in cloud (S3) or local storage.
     *
     * @return RedirectResponse|BinaryFileResponse|StreamedResponse|JsonResponse
     */
    public function show(string $path)
    {
        // 1. Iteratively sanitize path to prevent nested directory traversal (e.g. ....//) and null bytes
        $path = str_replace(["\0", '\\'], ['', '/'], $path);
        while (str_contains($path, '..')) {
            $path = str_replace('..', '', $path);
        }
        $path = ltrim($path, '/');

        // 2. Reject hidden dotfiles or non-media extensions (blocks .php, .env, .config, etc.)
        $basename = basename($path);
        $ext = strtolower(pathinfo($basename, PATHINFO_EXTENSION));
        if ($basename === '' || str_starts_with($basename, '.') || ! in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Access to requested file type is forbidden by security policy.',
            ], 403);
        }

        $disk = config('filesystems.default', 'local');

        // 3. Check if S3 disk is configured and contains the file
        if ($disk === 's3' || config('filesystems.disks.s3.key')) {
            try {
                if (Storage::disk('s3')->exists($path)) {
                    // Generate 7-day signed pre-signed URL for Tigris/S3 object storage
                    $url = Storage::disk('s3')->temporaryUrl($path, now()->addDays(7));

                    return redirect()->away($url, 307, [
                        'Cache-Control' => 'public, max-age=86400, stale-while-revalidate=604800',
                        'X-Content-Type-Options' => 'nosniff',
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning("S3 media fetch failed for path: {$path}. Error: ".$e->getMessage());
            }
        }

        // 4. Check public storage disk
        if (Storage::disk('public')->exists($path)) {
            $fullPath = Storage::disk('public')->path($path);

            return response()->file($fullPath, [
                'Cache-Control' => 'public, max-age=86400',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        // 5. Check Laravel public directory
        $publicFile = public_path($path);
        if (file_exists($publicFile) && ! is_dir($publicFile)) {
            return response()->file($publicFile, [
                'Cache-Control' => 'public, max-age=86400',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        // 6. Check frontend public directory for monorepo dev fallback
        $frontendPublic = base_path('../frontend/public/'.$path);
        if (file_exists($frontendPublic) && ! is_dir($frontendPublic)) {
            return response()->file($frontendPublic, [
                'Cache-Control' => 'public, max-age=86400',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Media file not found: '.$path,
        ], 404);
    }

    /**
     * Upload an image, video, or document to Cloud Storage (S3 / Tigris bucket).
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'max:102400', // max 100MB
                'mimes:jpg,jpeg,png,webp,gif,svg,ico,avif,mp4,webm,mov,pdf,doc,docx,xlsx,csv',
            ],
            'folder' => ['nullable', 'string', 'max:50', 'regex:/^[a-zA-Z0-9_\-\/]+$/'],
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension() ?: ($file->guessExtension() ?? 'bin'));

        if (! in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Disallowed file extension.',
            ], 422);
        }

        // Inspect first 8KB for embedded PHP tags or SVG XSS payloads (polyglot file defense)
        $realPath = $file->getRealPath();
        if ($realPath && is_readable($realPath)) {
            $headBytes = (string) file_get_contents($realPath, false, null, 0, 8192);
            if (preg_match('/(<\?php|<\?=|<script\b|javascript\s*:|onload\s*=|onerror\s*=)/i', $headBytes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Security violation: uploaded file contains executable script or polyglot payload.',
                ], 422);
            }
        }

        $folder = trim(str_replace('..', '', (string) $request->input('folder', 'uploads')), '/');

        // Determine target disk: prefer s3 if configured, else public
        $disk = config('filesystems.disks.s3.key') ? 's3' : config('filesystems.default', 'public');

        $filename = time().'_'.bin2hex(random_bytes(8)).'.'.$ext;
        $key = $folder ? "{$folder}/{$filename}" : $filename;

        try {
            $stream = fopen($realPath, 'r');
            Storage::disk($disk)->put($key, $stream);
            if (is_resource($stream)) {
                fclose($stream);
            }

            // Generate accessible URL
            $cloudUrl = null;
            if ($disk === 's3') {
                $cloudUrl = Storage::disk('s3')->temporaryUrl($key, now()->addDays(7));
            }

            $mediaProxyUrl = url("/api/v1/media/{$key}");

            return response()->json([
                'success' => true,
                'message' => 'Media successfully uploaded to cloud storage',
                'data' => [
                    'key' => $key,
                    'url' => $mediaProxyUrl,
                    'cloud_url' => $cloudUrl ?? $mediaProxyUrl,
                    'original_name' => basename($file->getClientOriginalName()),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'disk' => $disk,
                ],
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Cloud storage upload error: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload to cloud storage: '.$e->getMessage(),
            ], 500);
        }
    }
}

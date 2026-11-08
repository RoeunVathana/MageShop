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
     * Resolve and serve or redirect to media stored in cloud (S3) or local storage.
     */
    public function show(string $path): RedirectResponse|BinaryFileResponse|StreamedResponse|JsonResponse
    {
        // Sanitize path to prevent directory traversal
        $path = ltrim(str_replace('..', '', $path), '/');

        $disk = config('filesystems.default', 'local');

        // Check if S3 disk is configured and contains the file
        if ($disk === 's3' || config('filesystems.disks.s3.key')) {
            try {
                if (Storage::disk('s3')->exists($path)) {
                    // Generate 7-day signed pre-signed URL for Tigris/S3 object storage
                    $url = Storage::disk('s3')->temporaryUrl($path, now()->addDays(7));

                    return redirect()->away($url, 307, [
                        'Cache-Control' => 'public, max-age=86400, stale-while-revalidate=604800',
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning("S3 media fetch failed for path: {$path}. Error: " . $e->getMessage());
            }
        }

        // Check public storage disk
        if (Storage::disk('public')->exists($path)) {
            $fullPath = Storage::disk('public')->path($path);
            return response()->file($fullPath, [
                'Cache-Control' => 'public, max-age=86400',
            ]);
        }

        // Check Laravel public directory
        $publicFile = public_path($path);
        if (file_exists($publicFile) && !is_dir($publicFile)) {
            return response()->file($publicFile, [
                'Cache-Control' => 'public, max-age=86400',
            ]);
        }

        // Check frontend public directory for monorepo dev fallback
        $frontendPublic = base_path('../frontend/public/' . $path);
        if (file_exists($frontendPublic) && !is_dir($frontendPublic)) {
            return response()->file($frontendPublic, [
                'Cache-Control' => 'public, max-age=86400',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Media file not found: ' . $path,
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
                'mimes:jpg,jpeg,png,webp,gif,svg,mp4,webm,mov,pdf,doc,docx,xlsx,csv',
            ],
            'folder' => ['nullable', 'string', 'max:50', 'regex:/^[a-zA-Z0-9_\-\/]+$/'],
        ]);

        $file = $request->file('file');
        $folder = trim($request->input('folder', 'uploads'), '/');

        // Determine target disk: prefer s3 if configured, else public
        $disk = config('filesystems.disks.s3.key') ? 's3' : config('filesystems.default', 'public');

        $filename = time() . '_' . bin2hex(random_bytes(4)) . '.' . $file->getClientOriginalExtension();
        $key = $folder ? "{$folder}/{$filename}" : $filename;

        try {
            $stream = fopen($file->getRealPath(), 'r');
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
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'disk' => $disk,
                ],
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Cloud storage upload error: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload to cloud storage: ' . $e->getMessage(),
            ], 500);
        }
    }
}


<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class SyncMediaToCloud extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'media:sync-cloud {--force : Overwrite existing objects in cloud storage}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync brand images, videos, local uploads, and receipts to permanent S3 Cloud Storage without overwriting existing cloud files';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting Media Cloud Storage Synchronization (Zero-Deletion Mode)...');
        $disk = config('filesystems.disks.s3.key') ? 's3' : config('filesystems.default', 'public');
        $this->line("Target Storage Disk: <fg=cyan>{$disk}</>");

        // 1. Default branding assets from frontend/backend public directories
        $candidates = [
            'branding/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg' => [
                base_path('../frontend/public/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg'),
                public_path('Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg'),
            ],
            'branding/gemini_generated_video_4b7f1e53.mp4' => [
                base_path('../frontend/public/gemini_generated_video_4b7f1e53.mp4'),
                public_path('gemini_generated_video_4b7f1e53.mp4'),
            ],
            'branding/logo.jpg' => [
                base_path('../frontend/public/logo.jpg'),
                public_path('logo.jpg'),
            ],
            'branding/logo.png' => [
                base_path('../frontend/public/logo.png'),
                public_path('logo.png'),
            ],
            'branding/favicon.svg' => [
                base_path('../frontend/public/favicon.svg'),
                public_path('favicon.svg'),
            ],
        ];

        // 2. Also include any local files inside storage/app/public/{uploads,banners,products,brands,receipts,videos}
        $localPublicRoot = storage_path('app/public');
        if (is_dir($localPublicRoot)) {
            foreach (File::allFiles($localPublicRoot) as $fileInfo) {
                $relPath = str_replace('\\', '/', $fileInfo->getRelativePathname());
                if (! str_starts_with(basename($relPath), '.')) {
                    $candidates[$relPath] = [$fileInfo->getRealPath()];
                }
            }
        }

        $uploaded = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($candidates as $cloudKey => $possiblePaths) {
            $sourceFile = null;
            foreach ($possiblePaths as $p) {
                if ($p && file_exists($p)) {
                    $sourceFile = $p;
                    break;
                }
            }

            if (! $sourceFile) {
                $this->warn("Source not found for {$cloudKey}, skipping.");
                $skipped++;

                continue;
            }

            $alreadyExists = false;
            try {
                $alreadyExists = Storage::disk($disk)->exists($cloudKey);
            } catch (\Throwable $e) {
                // Ignore existence check exception and attempt upload
            }

            // NEVER overwrite or delete existing files in cloud storage unless --force is explicitly passed
            if ($alreadyExists && ! $this->option('force')) {
                $this->line("<fg=yellow>[PRESERVED]</> {$cloudKey} already exists in cloud storage.");
                $skipped++;

                continue;
            }

            $sizeMb = round(filesize($sourceFile) / (1024 * 1024), 2);
            $this->info("Uploading {$cloudKey} ({$sizeMb} MB)...");

            try {
                $stream = fopen($sourceFile, 'r');
                $result = Storage::disk($disk)->put($cloudKey, $stream);
                if (is_resource($stream)) {
                    fclose($stream);
                }

                if ($result) {
                    $this->info("<fg=green>[SUCCESS]</> {$cloudKey} backed up to {$disk}");
                    $uploaded++;
                } else {
                    $this->error("<fg=red>[FAIL]</> Failed to put {$cloudKey}");
                    $failed++;
                }
            } catch (\Throwable $e) {
                $this->error("<fg=red>[ERROR]</> {$cloudKey}: ".$e->getMessage());
                $failed++;
            }
        }

        $this->newLine();
        $this->info("Cloud Sync Summary: {$uploaded} uploaded, {$skipped} preserved/skipped, {$failed} failed.");

        return $failed > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}

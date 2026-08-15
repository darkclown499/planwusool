<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class BackupToS3 extends Command
{
    protected $signature = 'backup:s3 
                            {--database : Backup database only}
                            {--storage : Backup storage only}
                            {--all : Backup both database and storage}
                            {--compress : Compress backup files}
                            {--keep=7 : Number of days to keep backups}';

    protected $description = 'Backup database and storage to S3';

    public function handle(): int
    {
        $backupDatabase = $this->option('database') || $this->option('all');
        $backupStorage = $this->option('storage') || $this->option('all');
        $compress = $this->option('compress');
        $keepDays = (int) $this->option('keep');

        if (!$backupDatabase && !$backupStorage) {
            $this->error('Please specify --database, --storage, or --all');
            return self::FAILURE;
        }

        $timestamp = now()->format('Y-m-d_H-i-s');
        $bucket = config('filesystems.disks.s3.bucket');
        $prefix = config('backup.s3.prefix', 'backups');

        if (!$bucket) {
            $this->error('S3 bucket not configured. Please set AWS_BUCKET in .env');
            return self::FAILURE;
        }

        $this->info("Starting backup to S3 bucket: {$bucket}");

        $results = [];

        if ($backupDatabase) {
            $results['database'] = $this->backupDatabase($timestamp, $bucket, $prefix, $compress);
        }

        if ($backupStorage) {
            $results['storage'] = $this->backupStorage($timestamp, $bucket, $prefix, $compress);
        }

        // Cleanup old backups
        $this->cleanupOldBackups($bucket, $prefix, $keepDays);

        $this->displayResults($results);

        return self::SUCCESS;
    }

    protected function backupDatabase(string $timestamp, string $bucket, string $prefix, bool $compress): bool
    {
        $this->info('Starting database backup...');

        $database = config('database.connections.mysql.database');
        $username = config('database.connections.mysql.username');
        $password = config('database.connections.mysql.password');
        $host = config('database.connections.mysql.host', '127.0.0.1');
        $port = config('database.connections.mysql.port', '3306');

        $filename = "database_{$timestamp}.sql";
        if ($compress) {
            $filename .= '.gz';
        }

        $localPath = storage_path("app/backups/{$filename}");
        $s3Path = "{$prefix}/database/{$filename}";

        // Ensure backup directory exists
        if (!file_exists(dirname($localPath))) {
            mkdir(dirname($localPath), 0755, true);
        }

        // Build mysqldump command
        $command = "mysqldump --host={$host} --port={$port} --user={$username} --password={$password} --single-transaction --routines --triggers {$database}";

        if ($compress) {
            $command .= " | gzip > {$localPath}";
        } else {
            $command .= " > {$localPath}";
        }

        $process = new Process($command);
        $process->setTimeout(300);
        $process->run();

        if (!$process->isSuccessful()) {
            $this->error('Database backup failed: ' . $process->getErrorOutput());
            return false;
        }

        $this->info("Database backup created: {$localPath}");

        // Upload to S3
        if (!Storage::disk('s3')->put($s3Path, fopen($localPath, 'r'))) {
            $this->error('Failed to upload database backup to S3');
            return false;
        }

        $this->info("Database backup uploaded to S3: {$s3Path}");

        // Clean up local file
        @unlink($localPath);

        return true;
    }

    protected function backupStorage(string $timestamp, string $bucket, string $prefix, bool $compress): bool
    {
        $this->info('Starting storage backup...');

        $filename = "storage_{$timestamp}.tar";
        if ($compress) {
            $filename .= '.gz';
        }

        $localPath = storage_path("app/backups/{$filename}");
        $s3Path = "{$prefix}/storage/{$filename}";

        // Ensure backup directory exists
        if (!file_exists(dirname($localPath))) {
            mkdir(dirname($localPath), 0755, true);
        }

        $storagePath = storage_path('app');

        // Build tar command
        $command = "tar -cf {$localPath} -C {$storagePath} .";

        if ($compress) {
            $command .= " | gzip";
        }

        $process = new Process($command);
        $process->setTimeout(600);
        $process->run();

        if (!$process->isSuccessful()) {
            $this->error('Storage backup failed: ' . $process->getErrorOutput());
            return false;
        }

        $this->info("Storage backup created: {$localPath}");

        // Upload to S3
        if (!Storage::disk('s3')->put($s3Path, fopen($localPath, 'r'))) {
            $this->error('Failed to upload storage backup to S3');
            return false;
        }

        $this->info("Storage backup uploaded to S3: {$s3Path}");

        // Clean up local file
        @unlink($localPath);

        return true;
    }

    protected function cleanupOldBackups(string $bucket, string $prefix, int $keepDays): void
    {
        $this->info("Cleaning up backups older than {$keepDays} days...");

        $cutoff = now()->subDays($keepDays)->format('Y-m-d');

        $files = Storage::disk('s3')->allFiles($prefix);

        foreach ($files as $file) {
            // Extract date from filename (format: Y-m-d_H-i-s)
            if (preg_match('/(\d{4}-\d{2}-\d{2})/', $file, $matches)) {
                $fileDate = $matches[1];
                if ($fileDate < $cutoff) {
                    Storage::disk('s3')->delete($file);
                    $this->line("Deleted old backup: {$file}");
                }
            }
        }

        $this->info('Cleanup completed');
    }

    protected function displayResults(array $results): void
    {
        $this->newLine();
        $this->info('Backup Summary:');
        foreach ($results as $type => $success) {
            $status = $success ? '<fg=green>SUCCESS</>' : '<fg=red>FAILED</>';
            $this->line("  {$type}: {$status}");
        }
    }
}
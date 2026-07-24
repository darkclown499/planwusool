<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class GenerateAppleClientSecret extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'apple:generate-secret
                            {--key-path= : Path to the Apple private key (.p8) }
                            {--key-id= : Apple Key ID }
                            {--team-id= : Apple Team ID }
                            {--client-id= : Service ID / Client ID }
                            {--exp= : Expiration in seconds (default 15777000 = 6 months) }';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate Apple Sign In client secret (JWT) for use as APPLE_CLIENT_SECRET';

    public function handle()
    {
        $keyPath = $this->option('key-path') ?? config('services.apple.private_key_path') ?? env('APPLE_PRIVATE_KEY_PATH');
        $keyId = $this->option('key-id') ?? config('services.apple.key_id') ?? env('APPLE_KEY_ID');
        $teamId = $this->option('team-id') ?? config('services.apple.team_id') ?? env('APPLE_TEAM_ID');
        $clientId = $this->option('client-id') ?? config('services.apple.client_id') ?? env('APPLE_CLIENT_ID');
        $exp = (int)($this->option('exp') ?? 15777000);

        if (!$keyPath || !file_exists($keyPath)) {
            $this->error('Private key file not found. Provide --key-path or set APPLE_PRIVATE_KEY_PATH in .env');
            return 1;
        }

        if (!$keyId || !$teamId || !$clientId) {
            $this->error('Missing key_id, team_id or client_id. Provide via options or APPLE_KEY_ID / APPLE_TEAM_ID / APPLE_CLIENT_ID');
            return 1;
        }

        $privateKey = file_get_contents($keyPath);
        $now = time();
        $payload = [
            'iss' => $teamId,
            'iat' => $now,
            'exp' => $now + $exp,
            'aud' => 'https://appleid.apple.com',
            'sub' => $clientId,
        ];

        // Note: JWT::encode for ES256 requires the private key and alg ES256
        $jwt = JWT::encode($payload, $privateKey, 'ES256', $keyId);

        $this->info('Generated Apple client secret (paste into APPLE_CLIENT_SECRET in .env):');
        $this->line($jwt);

        return 0;
    }
}

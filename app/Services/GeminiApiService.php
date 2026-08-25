<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiApiService
{
    /**
     * Generate content via Google Gemini 1.5 Flash (Free tier).
     *
     * Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}
     *
     * @param string $prompt User prompt
     * @param string $language Language code (ar, en, etc.)
     * @param float|string $creativity Temperature value or low/medium/high legacy
     * @param int $maxTokens Max output tokens
     * @return string Generated text
     * @throws \Exception
     */
    public function generate(string $prompt, string $language = 'ar', $creativity = 0.7, int $maxTokens = 150): string
    {
        $apiKey = config('services.gemini.key');
        // Fallback to legacy Setting storage for backward compat
        if (empty($apiKey)) {
            try {
                $apiKey = \App\Models\Setting::where('key', 'geminiKey')->value('value')
                    ?? \App\Models\Setting::where('key', 'chatgptKey')->value('value');
            } catch (\Throwable $e) {
                // ignore
            }
        }
        // Also fallback to env directly
        if (empty($apiKey)) {
            $apiKey = env('GEMINI_API_KEY');
        }

        if (empty($apiKey)) {
            Log::error('Gemini API key missing', ['hint' => 'Add GEMINI_API_KEY to .env and config/services.php gemini.key']);
            throw new \Exception(__('Please set proper configuration for Gemini API Key. Add GEMINI_API_KEY to your .env file.'));
        }

        // Normalize creativity -> float temperature
        $temperature = $this->normalizeTemperature($creativity);

        // Normalize maxTokens
        $maxOutputTokens = (int) $maxTokens;
        if ($maxOutputTokens < 1) $maxOutputTokens = 150;
        if ($maxOutputTokens > 2048) $maxOutputTokens = 2048;

        $fullPrompt = "Language: " . $language . ". Prompt: " . $prompt;

        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $fullPrompt]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature' => (float) $temperature,
                'maxOutputTokens' => (int) $maxOutputTokens,
            ],
        ];

        $response = Http::timeout(30)->post($endpoint, $payload);

        if (!$response->successful()) {
            Log::error('Gemini API error', ['status' => $response->status(), 'body' => $response->body()]);
            $body = $response->json();
            $msg = $body['error']['message'] ?? $response->body();
            throw new \Exception('Gemini API error: ' . $msg);
        }

        $data = $response->json();

        // Expected: candidates[0].content.parts[0].text
        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;

        if (empty($text)) {
            // Try alternative path or dump for debugging
            Log::warning('Gemini empty response', ['data' => $data]);
            throw new \Exception(__('Text was not generated, please try again'));
        }

        return trim($text);
    }

    private function normalizeTemperature($creativity): float
    {
        if (is_string($creativity)) {
            // Handle legacy low/medium/high and also numeric strings
            if (is_numeric($creativity)) {
                return (float) $creativity;
            }
            return match (strtolower($creativity)) {
                'low', 'دقيق' => 0.2,
                'medium', 'متوازن' => 0.7,
                'high', 'إبداعي' => 1.0,
                default => 0.7,
            };
        }
        $val = (float) $creativity;
        // Clamp 0..2 but spec uses 0.2,0.7,1.0
        if ($val < 0) $val = 0.2;
        if ($val > 2) $val = 1.0;
        return $val;
    }
}

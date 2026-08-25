<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\GeminiApiService;
use Illuminate\Support\Facades\Log;

class AiAssistantController extends Controller
{
    public function __construct(private GeminiApiService $gemini) {}

    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'prompt' => 'required|string|max:2000',
            'language' => 'nullable|string|max:10',
            'creativity' => 'nullable',
            'maxTokens' => 'nullable|integer|min:1|max:2048',
            // legacy aliases
            'max_length' => 'nullable|integer|min:1|max:2048',
            'max_tokens' => 'nullable|integer|min:1|max:2048',
            'num_results' => 'nullable|integer|min:1|max:5',
        ]);

        try {
            $prompt = $request->input('prompt');
            $language = $request->input('language', 'ar');
            // Accept creativity as float, numeric string, or legacy low/medium/high
            $creativity = $request->input('creativity', $request->input('temperature', 0.7));
            // Accept maxTokens from multiple possible keys
            $maxTokens = $request->input('maxTokens')
                ?? $request->input('max_tokens')
                ?? $request->input('max_length')
                ?? 150;

            $generatedText = $this->gemini->generate(
                prompt: $prompt,
                language: $language,
                creativity: $creativity,
                maxTokens: (int) $maxTokens
            );

            // Spec requires JSON format ['text' => $generatedText]
            return response()->json([
                'success' => true,
                'text' => $generatedText,
                // keep aliases for backward compat
                'content' => $generatedText,
                'result' => $generatedText,
            ]);
        } catch (\Exception $e) {
            Log::error('AiAssistantController generate failed', [
                'message' => $e->getMessage(),
                'prompt' => $request->input('prompt'),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }
}

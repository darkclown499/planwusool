<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Setting;
use OpenAI;

class AIChatController extends Controller
{
    private string $fallbackMessage = 'تواصل مع الدعم عبر واتساب +972559886886 أو ايميل support@wusool.ps';

    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:500',
            'history' => 'nullable|array|max:20',
            'history.*.role' => 'required|in:user,assistant',
            'history.*.content' => 'required|string',
            'language' => 'nullable|string|in:en,ar',
        ]);

        try {
            $apiKey = Setting::where('key', 'chatgptKey')->value('value');
            $model = Setting::where('key', 'chatgptModel')->value('value') ?? 'gpt-3.5-turbo';

            if (!$apiKey) {
                return response()->json([
                    'success' => true,
                    'reply' => $this->fallbackMessage,
                ]);
            }

            $language = $request->input('language', 'ar');
            $langInstruction = $language === 'ar'
                ? 'أجب باللغة العربية الفصحى فقط. '
                : 'Answer in English only. ';

            $systemMessage = $langInstruction . 'You are Wusool AI assistant. You help users with:
- Creating and managing their WhatsApp online store
- Adding products, categories, and managing orders
- Choosing the right plan (Free, Growth, Professional)
- Payment methods, shipping settings, and store customization
- PWA mobile app setup and store settings
- SEO and store branding tips
- Any questions about the Wusool platform

Keep responses concise, friendly, and helpful. If you are unsure about something specific, say: "' . $this->fallbackMessage . '"';

            $messages = [
                ['role' => 'system', 'content' => $systemMessage],
            ];

            $history = $request->input('history', []);
            foreach ($history as $msg) {
                $messages[] = [
                    'role' => $msg['role'],
                    'content' => $msg['content'],
                ];
            }

            $messages[] = [
                'role' => 'user',
                'content' => $request->input('message'),
            ];

            $client = OpenAI::client($apiKey);

            $response = $client->chat()->create([
                'model' => $model,
                'messages' => $messages,
                'max_tokens' => 300,
                'temperature' => 0.7,
            ]);

            if (isset($response->choices[0]->message->content)) {
                return response()->json([
                    'success' => true,
                    'reply' => trim($response->choices[0]->message->content),
                ]);
            }

            return response()->json([
                'success' => true,
                'reply' => $this->fallbackMessage,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => true,
                'reply' => $this->fallbackMessage,
            ]);
        }
    }
}

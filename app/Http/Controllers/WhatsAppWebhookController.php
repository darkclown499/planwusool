<?php

namespace App\Http\Controllers;

use App\Models\StoreWhatsappIntegration;
use App\Models\WhatsappMessage;
use App\Models\WhatsappWebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    public function verify(Request $request)
    {
        $mode = $request->query('hub_mode', $request->query('hub.mode'));
        $token = $request->query('hub_verify_token', $request->query('hub.verify_token'));
        $challenge = $request->query('hub_challenge', $request->query('hub.challenge'));
        if ($mode === null) $mode = $request->input('hub.mode');
        if ($token === null) $token = $request->input('hub.verify_token');
        if ($challenge === null) $challenge = $request->input('hub.challenge');
        if (!$mode && isset($request->query()['hub.mode'])) $mode = $request->query()['hub.mode'];
        if ($mode !== 'subscribe') {
            return response('Invalid mode', 403);
        }
        $expectedGlobal = (string) config('services.whatsapp.verify_token', env('WHATSAPP_VERIFY_TOKEN', ''));
        $isValid = false;
        if ($expectedGlobal !== '' && hash_equals($expectedGlobal, (string) $token)) {
            $isValid = true;
        }
        if (!$isValid && $token) {
            $integrations = StoreWhatsappIntegration::whereNotNull('webhook_verify_token')->get();
            foreach ($integrations as $int) {
                $storeToken = $int->webhook_verify_token;
                if ($storeToken && hash_equals((string) $storeToken, (string) $token)) {
                    $isValid = true;
                    break;
                }
            }
        }
        if (!$isValid) {
            Log::warning('WhatsApp webhook verification rejected');
            return response('Verification failed', 403);
        }
        return response((string) $challenge, 200)->header('Content-Type', 'text/plain');
    }

    public function handle(Request $request)
    {
        $payload = $request->json()->all();
        if (empty($payload) || !is_array($payload)) {
            $raw = $request->getContent();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $payload = $decoded;
        }
        if (!isset($payload['object']) || $payload['object'] !== 'whatsapp_business_account') {
            if (empty($payload['object']) && empty($payload['entry'])) {
                return response()->json(['error' => 'malformed payload'], 400);
            }
            if (isset($payload['object']) && $payload['object'] !== 'whatsapp_business_account') {
                return response()->json(['status' => 'ignored'], 200);
            }
        }
        $entries = $payload['entry'] ?? null;
        if (!is_array($entries) || empty($entries)) {
            return response()->json(['error' => 'malformed: missing entry'], 400);
        }
        foreach ($entries as $entry) {
            $changes = $entry['changes'] ?? [];
            if (!is_array($changes)) continue;
            foreach ($changes as $change) {
                $field = $change['field'] ?? '';
                $value = $change['value'] ?? [];
                if ($field !== 'messages') continue;
                if (!is_array($value)) continue;
                $metadata = $value['metadata'] ?? [];
                $phoneNumberId = $metadata['phone_number_id'] ?? null;
                $storeId = null;
                if ($phoneNumberId) {
                    $integration = StoreWhatsappIntegration::where('phone_number_id', (string) $phoneNumberId)->first();
                    if ($integration) $storeId = $integration->store_id;
                }
                if (!$storeId) {
                    Log::info('WhatsApp webhook: unknown phone_number_id', ['phone_number_id' => substr((string)$phoneNumberId, 0, 20)]);
                    continue;
                }
                $statuses = $value['statuses'] ?? [];
                if (is_array($statuses) && !empty($statuses)) {
                    foreach ($statuses as $s) {
                        $wamid = $s['id'] ?? $s['message_id'] ?? null;
                        $statusRaw = $s['status'] ?? null;
                        if (!$wamid || !$statusRaw) continue;
                        $mapped = WhatsappMessage::mapMetaStatus((string) $statusRaw);
                        if (!$mapped) {
                            if (!in_array(strtolower($statusRaw), ['sent','delivered','read','failed'], true)) continue;
                            $mapped = strtolower($statusRaw);
                        }
                        $eventId = (string) $wamid . ':' . $mapped;
                        try {
                            $event = WhatsappWebhookEvent::firstOrCreate(
                                ['event_id' => $eventId],
                                [
                                    'store_id' => $storeId,
                                    'provider_message_id' => (string) $wamid,
                                    'status' => $mapped,
                                    'payload' => $s,
                                    'processed_at' => now(),
                                ]
                            );
                            if (!$event->wasRecentlyCreated) {
                                continue;
                            }
                        } catch (\Throwable $e) {
                            if (str_contains($e->getMessage(), 'Duplicate') || str_contains($e->getMessage(), 'UNIQUE') || $e->getCode() == 23000) {
                                continue;
                            }
                            Log::warning('Webhook event duplicate check failed', ['error' => substr($e->getMessage(), 0, 200)]);
                            continue;
                        }
                        $msg = WhatsappMessage::where('provider_message_id', (string) $wamid)
                            ->where('store_id', $storeId)
                            ->first();
                        if (!$msg) {
                            Log::info('WhatsApp status for unknown message', ['store_id' => $storeId, 'wamid' => substr((string)$wamid, 0, 30), 'status' => $mapped]);
                            continue;
                        }
                        $allowed = ['sent','delivered','read','failed'];
                        if (!in_array($mapped, $allowed, true)) continue;
                        $order = ['queued'=>0,'sent'=>1,'delivered'=>2,'read'=>3,'failed'=>4];
                        $currentRank = $order[$msg->status] ?? 0;
                        $newRank = $order[$mapped] ?? 0;
                        if ($mapped !== 'failed' && $newRank <= $currentRank) continue;
                        $updates = ['status' => $mapped];
                        if ($mapped === 'delivered') $updates['delivered_at'] = now();
                        if ($mapped === 'read') $updates['read_at'] = now();
                        if ($mapped === 'failed') {
                            $updates['failed_at'] = now();
                            $errors = $s['errors'] ?? null;
                            if ($errors) $updates['last_error'] = substr(json_encode($errors, JSON_UNESCAPED_UNICODE), 0, 500);
                            else $updates['last_error'] = substr($s['title'] ?? 'failed', 0, 500);
                        }
                        if ($mapped === 'sent' && !$msg->sent_at) $updates['sent_at'] = now();
                        $msg->update($updates);
                        if ($msg->abandoned_cart_id) {
                            try {
                                \App\Models\AbandonedCart::where('id', $msg->abandoned_cart_id)
                                    ->where('store_id', $storeId)
                                    ->update(['whatsapp_status' => $mapped]);
                            } catch (\Throwable $e) {}
                        }
                    }
                }
            }
        }
        return response()->json(['status' => 'ok'], 200);
    }
}

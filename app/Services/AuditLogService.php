<?php

namespace App\Services;

use App\Models\AdminAuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AuditLogService
{
    public static function log(
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        ?int $companyId = null,
        ?array $metadata = null,
        ?Request $request = null
    ): ?AdminAuditLog {
        try {
            $actor = Auth::user();
            if (!$actor) {
                return null;
            }

            $requestData = $request ? [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ] : [];

            return AdminAuditLog::create([
                'actor_user_id' => $actor->id,
                'action' => $action,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'company_id' => $companyId,
                'metadata' => $metadata,
                'ip_address' => $requestData['ip'] ?? null,
                'user_agent' => $requestData['user_agent'] ?? null,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to write admin audit log', [
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    public static function getLogs(
        ?string $action = null,
        ?string $targetType = null,
        ?int $targetId = null,
        ?int $companyId = null,
        ?int $actorUserId = null,
        ?string $startDate = null,
        ?string $endDate = null,
        int $perPage = 25
    ) {
        $query = AdminAuditLog::with('actor');

        if ($action) {
            $query->where('action', $action);
        }

        if ($targetType) {
            $query->where('target_type', $targetType);
            if ($targetId) {
                $query->where('target_id', $targetId);
            }
        }

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        if ($actorUserId) {
            $query->where('actor_user_id', $actorUserId);
        }

        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('created_at', '<=', $endDate . ' 23:59:59');
        }

        return $query->orderByDesc('created_at')->paginate($perPage);
    }
}

<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminAuditLogController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->isSuperAdmin()) {
            abort(403);
        }

        $logs = AuditLogService::getLogs(
            action: $request->input('action'),
            targetType: $request->input('target_type'),
            targetId: $request->input('target_id'),
            companyId: $request->input('company_id'),
            actorUserId: $request->input('actor_user_id'),
            startDate: $request->input('start_date'),
            endDate: $request->input('end_date'),
            perPage: (int) $request->input('per_page', 25)
        );

        $logs->getCollection()->transform(function ($log) {
            return [
                'id' => $log->id,
                'actor' => $log->actor ? [
                    'id' => $log->actor->id,
                    'name' => $log->actor->name,
                    'email' => $log->actor->email,
                ] : null,
                'action' => $log->action,
                'target_type' => $log->target_type,
                'target_id' => $log->target_id,
                'company_id' => $log->company_id,
                'metadata' => $log->metadata,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at?->toISOString(),
            ];
        });

        return Inertia::render('admin/audit-logs', [
            'logs' => $logs,
            'filters' => $request->only([
                'action', 'target_type', 'target_id', 'company_id', 'actor_user_id', 'start_date', 'end_date', 'per_page'
            ]),
        ]);
    }
}
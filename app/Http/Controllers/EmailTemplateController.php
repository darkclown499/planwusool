<?php

namespace App\Http\Controllers;

use App\Models\EmailTemplate;
use App\Services\EmailTemplateService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmailTemplateController extends Controller
{
    public function index(Request $request)
    {
        $query = EmailTemplate::with('emailTemplateLangs')->where('user_id', auth()->id());
        
        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('from', 'like', '%' . $request->search . '%');
        }
        
        // Sorting
        $allowedSortFields = ['name', 'from', 'created_at', 'id', 'updated_at'];
        $sortField = in_array($request->get('sort_field'), $allowedSortFields)
            ? $request->get('sort_field') : 'created_at';
        $sortDirection = $request->get('sort_direction', 'desc');
        if (!in_array(strtolower($sortDirection), ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }
        $query->orderBy($sortField, $sortDirection);
        
        // Pagination
        $perPage = $request->get('per_page', 10);
        $templates = $query->paginate($perPage);
        
        return Inertia::render('email-templates/index', [
            'templates' => $templates,
            'filters' => $request->only(['search', 'sort_field', 'sort_direction', 'per_page'])
        ]);
    }

    public function show(EmailTemplate $emailTemplate)
    {
        $template = $emailTemplate->load('emailTemplateLangs');
        $languages = json_decode(file_get_contents(resource_path('lang/language.json')), true);
        
        // Template-specific variables
        $variables = [];
        
        if ($template->name === 'Order Created') {
            $variables = [
                '{app_name}' => 'App Name',
                '{order_name}' => 'Order Name',
                '{order_url}' => 'Order URL'
            ];
        } elseif ($template->name === 'Order Created For Owner') {
            $variables = [
                '{app_name}' => 'App Name',
                '{owner_name}' => 'Owner Name',
                '{order_id}' => 'Order ID',
                '{order_date}' => 'Order Date',
                '{order_url}' => 'Order URL'
            ];
        } elseif ($template->name === 'Owner And Store Created') {
            $variables = [
                '{app_name}' => 'App Name',
                '{owner_name}' => 'Owner Name',
                '{owner_email}' => 'Owner Email',
                '{owner_password}' => 'Owner Password',
                '{app_url}' => 'App URL',
                '{store_url}' => 'Store URL'
            ];
        } elseif ($template->name === 'Status Change') {
            $variables = [
                '{app_name}' => 'App Name',
                '{order_name}' => 'Order Name',
                '{order_status}' => 'Order Status',
                '{order_url}' => 'Order URL'
            ];
        } elseif ($template->name === 'User Created') {
            $variables = [
                '{app_url}' => 'App URL',
                '{user_name}' => 'User Name',
                '{user_email}' => 'User Email',
                '{user_password}' => 'User Password',
                '{user_type}' => 'User Type'
            ];
        }

        return Inertia::render('email-templates/show', [
            'template' => [
                'id' => $template->id,
                'name' => $template->name,
                'from' => $template->from,
                'email_template_langs' => $template->emailTemplateLangs->map(function($lang) {
                    return [
                        'id' => $lang->id,
                        'lang' => $lang->lang,
                        'subject' => $lang->subject,
                        'content' => $lang->content
                    ];
                })
            ],
            'languages' => $languages,
            'variables' => $variables
        ]);
    }

    public function updateSettings(EmailTemplate $emailTemplate, Request $request)
    {
        $request->validate([
            'from' => 'required|string|max:255'
        ], [], [
            'from' => __('From'),
        ]);

        $emailTemplate->update([
            'from' => $request->from
        ]);
        
        return redirect()->back()->with('success', __('Template settings updated successfully.'));
    }

    public function updateContent(EmailTemplate $emailTemplate, Request $request)
    {
        $request->validate([
            'lang' => 'required|string|max:10',
            'subject' => 'required|string|max:255',
            'content' => 'required|string'
        ], [], [
            'subject' => __('Subject'),
            'content' => __('Content'),
        ]);

        $langRecord = $emailTemplate->emailTemplateLangs()
            ->where('lang', $request->lang)
            ->first();
            
        if ($langRecord) {
            $langRecord->update([
                'subject' => $request->subject,
                'content' => $request->content
            ]);
        } else {
            $emailTemplate->emailTemplateLangs()->create([
                'lang' => $request->lang,
                'subject' => $request->subject,
                'content' => $request->content
            ]);
        }
        
        return redirect()->back()->with('success', __('Email content updated successfully.'));
    }
    
    public function preview(EmailTemplate $emailTemplate, Request $request)
    {
        try {
            $language = $request->get('lang', 'en');
            $service = new EmailTemplateService();
            
            $preview = $service->previewTemplate($emailTemplate->name, $language);
            
            return response()->json([
                'success' => true,
                'preview' => $preview
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }
    
    public function getVariables(EmailTemplate $emailTemplate)
    {
        try {
            $service = new EmailTemplateService();
            $variables = $service->discoverTemplateVariables($emailTemplate->name);
            
            return response()->json([
                'success' => true,
                'variables' => $variables
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }
}

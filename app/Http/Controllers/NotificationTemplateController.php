<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\NotificationTemplateLang;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class NotificationTemplateController extends Controller
{
    public function index()
    {
        $notifications = Notification::with('templateLangs')->get();
        
        return Inertia::render('notification-templates/index', [
            'notifications' => $notifications
        ]);
    }

    public function create()
    {
        $languages = NotificationTemplateLang::distinct()->pluck('lang')->toArray();
        if (empty($languages)) {
            $languages = ['en']; // fallback
        }
        
        return Inertia::render('notification-templates/create', [
            'languages' => $languages
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|string|max:255',
            'action' => 'required|string|max:255|unique:notifications,action',
            'status' => 'required|in:on,off',
            'templates' => 'required|array',
            'templates.*.lang' => 'required|string|max:10',
            'templates.*.content' => 'required|string',
        ], [
            'templates.*.content.required' => __('The SMS message content field is required.'),
        ], [
            'templates.*.content' => __('content'),
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->with('error', __('Validation failed'));
        }

        try {
            $notification = Notification::create([
                'type' => $request->type,
                'action' => $request->action,
                'status' => $request->status,
            ]);

            foreach ($request->templates as $template) {
                NotificationTemplateLang::create([
                    'parent_id' => $notification->id,
                    'lang' => $template['lang'],
                    'content' => $template['content'],
                    'variables' => json_encode($template['variables'] ?? []),
                ]);
            }

            return redirect()->route('notification-templates.index')->with('success', __('Template created successfully'));
        } catch (\Exception $e) {
            return back()->with('error', __('Failed to create template: ') . $e->getMessage());
        }
    }

    public function show($id)
    {
        $notification = Notification::with('templateLangs')->findOrFail($id);
        $languages = NotificationTemplateLang::distinct()->pluck('lang')->toArray();
        if (empty($languages)) {
            $languages = ['en']; // fallback
        }
        
        // Format languages for the UI
        $formattedLanguages = collect($languages)->map(function($code) {
            return [
                'code' => $code,
                'name' => $this->getLanguageName($code),
                'countryCode' => $code
            ];
        })->toArray();
        
        return Inertia::render('notification-templates/show', [
            'notification' => $notification,
            'languages' => $formattedLanguages
        ]);
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:on,off',
            'templates' => 'required|array',
            'templates.*.lang' => 'required|string|max:10',
            'templates.*.content' => 'required|string',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->with('error', __('Validation failed'));
        }

        try {
            $notification = Notification::findOrFail($id);
            $notification->update([
                'status' => $request->status,
            ]);

            // Update existing template languages
            foreach ($request->templates as $template) {
                NotificationTemplateLang::updateOrCreate(
                    [
                        'parent_id' => $notification->id,
                        'lang' => $template['lang']
                    ],
                    [
                        'content' => $template['content']
                    ]
                );
            }

            return back()->with('success', __('Template updated successfully'));
        } catch (\Exception $e) {
            return back()->with('error', __('Failed to update template: ') . $e->getMessage());
        }
    }

    private function getLanguageName($code)
    {
        $names = [
            'en' => 'English',
            'es' => 'Spanish',
            'ar' => 'Arabic',
            'da' => 'Danish',
            'de' => 'German',
            'fr' => 'French',
            'he' => 'Hebrew',
            'it' => 'Italian',
            'ja' => 'Japanese',
            'nl' => 'Dutch',
            'pl' => 'Polish',
            'pt' => 'Portuguese',
            'pt-BR' => 'Portuguese (Brazil)',
            'ru' => 'Russian',
            'tr' => 'Turkish',
            'zh' => 'Chinese'
        ];
        
        return $names[$code] ?? ucfirst($code);
    }
}
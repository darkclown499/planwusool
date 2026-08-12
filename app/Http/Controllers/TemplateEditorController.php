<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\Template;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TemplateEditorController extends Controller
{
    /**
     * Files the super admin can edit for a single store. Everything here is
     * scoped to that store only (its own overrides/CSS/JS), so changes never
     * leak to other users or to the shared template definition.
     */
    private const EDITABLE_FILES = [
        'custom.css',
        'custom.js',
        'theme-overrides.json',
        'design-tokens.json',
        'content.json',
    ];

    /**
     * List companies (users) with their stores. Search covers the user's name
     * and email as well as the store name, slug, custom domain and verified
     * domain so the admin can jump straight to a store's template editor.
     */
    public function index(Request $request)
    {
        $query = User::query()
            ->where('type', 'company')
            ->with(['stores' => function ($q) {
                $q->orderBy('name');
            }])
            ->withCount('stores');

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('stores', function ($sq) use ($search) {
                        $sq->where('name', 'like', "%{$search}%")
                            ->orWhere('slug', 'like', "%{$search}%")
                            ->orWhere('custom_domain', 'like', "%{$search}%")
                            ->orWhere('custom_subdomain', 'like', "%{$search}%");
                    })
                    ->orWhereHas('stores.storeDomains', function ($dq) use ($search) {
                        $dq->where('domain_name', 'like', "%{$search}%");
                    });
            });
        }

        $companies = $query->orderBy('created_at', 'desc')
            ->paginate((int) $request->get('per_page', 10))
            ->withQueryString();

        $companies->getCollection()->transform(function ($company) {
            return [
                'id' => $company->id,
                'name' => cleanUtf8((string) $company->name),
                'email' => $company->email,
                'status' => $company->status,
                'avatar' => $company->avatar,
                'created_at' => $company->created_at?->format('Y-m-d H:i:s'),
                'stores_count' => $company->stores_count,
                'stores' => $company->stores->map(function ($store) {
                    $template = Template::where('slug', $store->getTemplateSlug())
                        ->where('is_active', true)
                        ->first();

                    return [
                        'id' => $store->id,
                        'name' => cleanUtf8((string) $store->name),
                        'slug' => $store->slug,
                        'store_url' => $store->getStoreUrl(),
                        'template_slug' => $store->getTemplateSlug(),
                        'template_name' => $template && $template->name
                            ? cleanUtf8((string) $template->name)
                            : $store->getTemplateSlug(),
                    ];
                })->values(),
            ];
        });

        return Inertia::render('superadmin/template-editor/index', [
            'companies' => $companies,
            'filters' => $request->only(['search', 'per_page']),
        ]);
    }

    /**
     * Open the code editor for a specific store's effective template.
     */
    public function show($storeId)
    {
        $store = Store::with('user')->findOrFail($storeId);
        $template = Template::where('slug', $store->getTemplateSlug())->first();
        $configuration = StoreConfiguration::getConfiguration($store->id);

        return Inertia::render('superadmin/template-editor/show', [
            'store' => [
                'id' => $store->id,
                'name' => cleanUtf8((string) $store->name),
                'slug' => $store->slug,
                'store_url' => $store->getStoreSubdomainUrl(),
                'template_slug' => $store->getTemplateSlug(),
                'template_name' => $template && $template->name
                    ? cleanUtf8((string) $template->name)
                    : $store->getTemplateSlug(),
                'owner' => $store->user ? [
                    'id' => $store->user->id,
                    'name' => cleanUtf8((string) $store->user->name),
                    'email' => $store->user->email,
                ] : null,
            ],
            'files' => $this->editorFiles($store, $template, $configuration),
        ]);
    }

    /**
     * Persist a single file belonging to this store's effective template.
     */
    public function save(Request $request, $storeId)
    {
        $store = Store::findOrFail($storeId);

        $file = $request->input('file');
        $content = $request->input('content');

        if (!in_array($file, self::EDITABLE_FILES, true)) {
            return response()->json(['error' => __('Invalid file name.')], 422);
        }

        if (!is_string($content)) {
            return response()->json(['error' => __('Missing file content.')], 422);
        }

        // Cap the size of the raw CSS/JS payloads (mirrors the settings form).
        if (in_array($file, ['custom.css', 'custom.js'], true) && mb_strlen($content) > 100000) {
            return response()->json(['error' => __('File is too large.')], 422);
        }

        switch ($file) {
            case 'custom.css':
                StoreConfiguration::setConfiguration($store->id, 'custom_css', $content);
                break;

            case 'custom.js':
                StoreConfiguration::setConfiguration($store->id, 'custom_javascript', $content);
                break;

            case 'theme-overrides.json':
                $store->template_overrides = $this->decodeJsonField($content);
                $store->save();
                break;

            case 'design-tokens.json':
                $store->design_tokens = $this->decodeJsonField($content);
                $store->save();
                break;

            case 'content.json':
                $store->store_content = $this->decodeJsonField($content);
                $store->save();
                break;
        }

        return response()->json([
            'success' => true,
            'message' => __('Template file saved successfully.'),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function editorFiles(Store $store, ?Template $template, array $configuration): array
    {
        $reference = [
            'name' => $template->name ?? $template->slug ?? $store->getTemplateSlug(),
            'slug' => $store->getTemplateSlug(),
            'config' => $template->config ?? [],
            'design_tokens' => $template->design_tokens ?? [],
        ];

        return [
            [
                'name' => 'custom.css',
                'language' => 'css',
                'readOnly' => false,
                'description' => __('Custom CSS injected only on this store.'),
                'content' => $configuration['custom_css'] ?: '',
            ],
            [
                'name' => 'custom.js',
                'language' => 'javascript',
                'readOnly' => false,
                'description' => __('Custom JavaScript injected only on this store.'),
                'content' => $configuration['custom_javascript'] ?: '',
            ],
            [
                'name' => 'theme-overrides.json',
                'language' => 'json',
                'readOnly' => false,
                'description' => __('Section order and visibility overrides for this store.'),
                'content' => $this->prettyJson($store->template_overrides),
            ],
            [
                'name' => 'design-tokens.json',
                'language' => 'json',
                'readOnly' => false,
                'description' => __('Colors, fonts and spacing for this store.'),
                'content' => $this->prettyJson($store->design_tokens),
            ],
            [
                'name' => 'content.json',
                'language' => 'json',
                'readOnly' => false,
                'description' => __('Store marketing content (announcement, banners, testimonials...).'),
                'content' => $this->prettyJson($store->store_content),
            ],
            [
                'name' => 'template-reference.json',
                'language' => 'json',
                'readOnly' => true,
                'description' => __('Read-only reference of the template this store is using.'),
                'content' => $this->prettyJson($reference),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJsonField(string $content): array
    {
        $decoded = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            abort(response()->json([
                'error' => __('Invalid JSON: ') . json_last_error_msg(),
            ], 422));
        }

        return is_array($decoded) ? $decoded : [];
    }

    private function prettyJson($value): string
    {
        if (is_null($value) || $value === []) {
            return "{}";
        }

        return json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
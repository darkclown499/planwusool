<?php
namespace App\Http\Controllers;

use App\Models\Role;
use Inertia\Inertia;
use App\Models\Permission;
use Illuminate\Support\Str;
use App\Http\Requests\RoleRequest;
use Illuminate\Support\Facades\Auth;

class RoleController extends BaseController
{
    /**
     * Constructor to apply middleware
     */
   

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $authUser = Auth::user();
        $authUserRole = $authUser->roles->first()?->name;
        
        // Permission check
        if (!$authUser->hasPermissionTo('manage-roles')) {
            abort(403, 'Unauthorized Access Prevented');
        }

        $roleQuery = Role::withPermissionCheck()->with(['permissions', 'creator'])->latest();
        
        // Filter roles based on user type
        if ($authUserRole === 'company') {
            // Company users can only see roles they created (exclude system roles)
            $roleQuery->where('created_by', $authUser->id)
                ->whereNotIn('name', ['superadmin', 'company']);
        } elseif ($authUser->type !== 'superadmin') {
            // Sub-users can only see roles created by their creator
            $roleQuery->where('created_by', $authUser->created_by)
                ->whereNotIn('name', ['superadmin', 'company']);
        }
        
        $roles = $roleQuery->paginate(10);
        $permissions = $this->getFilteredPermissions();

        return Inertia::render('roles/index', [
            'roles'       => $roles,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Get permissions filtered by user role
     */
    private function getFilteredPermissions()
    {
        $user = Auth::user();
        $userType = $user->type ?? 'company';
        
        // Superadmin can see all permissions
        if ($userType === 'superadmin' || $userType === 'superadmin') {
            return Permission::all()->groupBy('module');
        }
        
        // Get allowed modules for current user role
        $allowedModules = config('role-permissions.' . $userType, config('role-permissions.company'));
        
        // Filter permissions by allowed modules
        $query = Permission::whereIn('module', $allowedModules);
        
        // For company users, exclude superadmin-only permissions and filter settings
        if ($userType === 'company') {
            $query->whereNotIn('name', [
                'manage-any-users', 
                'manage-own-users',
                'manage-any-roles',
                'manage-own-roles',
                'manage-any-plans',
                'manage-own-plans',
                'manage-any-media',
                // Plans superadmin-only permissions
                'view-plans',
                'create-plans',
                'edit-plans',
                'delete-plans',
                'approve-plan-requests',
                'reject-plan-requests',
                'approve-plan-orders',
                'reject-plan-orders',
                // Referral superadmin-only permissions
                'manage-setting-referral',
                'approve-payout-referral',
                'reject-payout-referral'
            ]);
            
            // When in settings module, only show manage-settings permission
            $query->where(function($q) {
                $q->where('module', '!=', 'settings')
                  ->orWhereIn('name', [
                      'manage-settings'
                  ]);
            });
        }
        
        $permissions = $query->get()->groupBy('module');
        
        return $permissions;
    }

    /**
     * Validate permissions against user's allowed modules AND grant-what-you-have.
     * Returns only permissions the actor actually possesses.
     */
    private function validatePermissions(array $permissionNames)
    {
        $user = Auth::user();
        $userType = $user->type ?? 'company';

        // Superadmin can assign any permission
        if ($userType === 'superadmin') {
            return $permissionNames;
        }

        // Get allowed modules for current user role
        $allowedModules = config('role-permissions.' . $userType, config('role-permissions.company'));

        // Build query to get valid permissions by module
        $query = Permission::whereIn('module', $allowedModules)
            ->whereIn('name', $permissionNames);

        // For company users, exclude superadmin-only permissions and restrict settings
        if ($userType === 'company') {
            $query->whereNotIn('name', [
                'manage-any-users',
                'manage-own-users',
                'manage-any-roles',
                'manage-own-roles',
                'manage-any-plans',
                'manage-own-plans',
                'manage-any-media',
                'view-plans',
                'create-plans',
                'edit-plans',
                'delete-plans',
                'approve-plan-requests',
                'reject-plan-requests',
                'approve-plan-orders',
                'reject-plan-orders',
                'manage-setting-referral',
                'approve-payout-referral',
                'reject-payout-referral'
            ]);

            $query->where(function($q) {
                $q->where('module', '!=', 'settings')
                  ->orWhereIn('name', [
                      'manage-settings'
                  ]);
            });
        }

        $validPermissions = $query->pluck('name')->toArray();

        // Grant-what-you-have: intersect with actor's actual permissions
        $actorPerms = $user->getAllPermissions()->pluck('name')->toArray();
        $validPermissions = array_values(array_intersect($validPermissions, $actorPerms));

        return $validPermissions;
    }

    /**
     * Ensure tenant user cannot edit system roles and cannot edit their own current role.
     */
    private function authorizeRoleTarget(Role $role): void
    {
        $actor = Auth::user();

        if ($actor->isSuperAdmin()) {
            return;
        }

        if ($role->is_system_role) {
            abort(403, 'System roles cannot be modified');
        }

        // Tenant scope: created_by must match hierarchy
        if ($actor->type === 'company' && (int) $role->created_by !== (int) $actor->id) {
            abort(403, 'Unauthorized to modify this role');
        } elseif ($actor->type !== 'superadmin' && $actor->type !== 'company' && (int) $role->created_by !== (int) $actor->created_by) {
            abort(403, 'Unauthorized to modify this role');
        }

        // Block editing own current role (privilege escalation)
        $actorRoleIds = $actor->roles()->pluck('roles.id')->toArray();
        if (in_array($role->id, $actorRoleIds, true)) {
            abort(403, 'Cannot edit your own role');
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Generate a unique slug for a role, auto-incrementing on collision.
     * e.g. manager → manager-1 → manager-2
     */
    private function generateUniqueSlug(string $label, ?int $excludeId = null): string
    {
        $base = Str::slug($label);
        $slug = $base;
        $counter = 1;

        while (
            Role::where('name', $slug)
                ->where('guard_name', 'web')
                ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
                ->exists()
        ) {
            $slug = $base . '-' . $counter++;
        }

        return $slug;
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(RoleRequest $request)
    {
        // Validate permissions against user's allowed modules
        $validatedPermissions = $this->validatePermissions($request->permissions ?? []);
        
        // Use direct model creation to bypass Spatie's duplicate check
        $role = new Role();
        $role->label = $request->label;
        $role->name = $this->generateUniqueSlug($request->label);
        $role->description = $request->description;
        $role->created_by = Auth::id();
        $role->guard_name = 'web';
        $role->save();

        if ($role) {
            $role->syncPermissions($validatedPermissions);

            return redirect()->route('roles.index')->with('success', __('Role created successfully with Permissions!'));
        }
        return redirect()->back()->with('error', __('Unable to create Role with permissions. Please try again!'));
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        if (!Auth::user()->can('view-roles')) {
            return redirect()->back()->with('error', __('You do not have permission to view roles.'));
        }
        
        $authUser = Auth::user();
        $roleQuery = Role::query();
        
        // Filter roles based on user type (mirrors index)
        if ($authUser->type === 'company') {
            $roleQuery->where('created_by', $authUser->id)
                ->whereNotIn('name', ['superadmin', 'company']);
        } elseif ($authUser->type !== 'superadmin') {
            $roleQuery->where('created_by', $authUser->created_by)
                ->whereNotIn('name', ['superadmin', 'company']);
        }
        
        $role = $roleQuery->with(['permissions'])->findOrFail($id);
        
        return Inertia::render('roles/view', [
            'role' => $role
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        if (!Auth::user()->can('edit-roles')) {
            return redirect()->back()->with('error', __('You do not have permission to edit roles.'));
        }
        
        $authUser = Auth::user();
        $roleQuery = Role::query();
        
        // Filter roles based on user type (mirrors index)
        if ($authUser->type === 'company') {
            $roleQuery->where('created_by', $authUser->id)
                ->whereNotIn('name', ['superadmin', 'company']);
        } elseif ($authUser->type !== 'superadmin') {
            $roleQuery->where('created_by', $authUser->created_by)
                ->whereNotIn('name', ['superadmin', 'company']);
        }
        
        $role = $roleQuery->findOrFail($id);
        
        $permissions = $this->getFilteredPermissions();
        
        return Inertia::render('roles/edit', [
            'role' => $role,
            'permissions' => $permissions
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(RoleRequest $request, Role $role)
    {
        $this->authorizeRoleTarget($role);

        if ($role) {
            // Validate permissions against user's allowed modules + grant-what-you-have
            $validatedPermissions = $this->validatePermissions($request->permissions ?? []);

            $role->name = $this->generateUniqueSlug($request->label, $role->id);

            $role->label       = $request->label;
            $role->description = $request->description;

            $role->save();

            # Update the permissions
            $role->syncPermissions($validatedPermissions);

            return redirect()->route('roles.index')->with('success', __('Role updated successfully with Permissions!'));
        }
        return redirect()->back()->with('error', __('Unable to update Role with permissions. Please try again!'));

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Role $role)
    {
        if (!Auth::user()->can('delete-roles')) {
            return redirect()->back()->with('error', __('You do not have permission to delete roles.'));
        }

        // Reuse same hierarchy + own-role + system-role checks
        $this->authorizeRoleTarget($role);

        $authUser = Auth::user();
        
        if ($role) {
            // Prevent deletion of system roles
            if ($role->is_system_role) {
                return redirect()->back()->with('error', __('System roles cannot be deleted!'));
            }
            
            $role->delete();

            return redirect()->route('roles.index')->with('success', __('Role deleted successfully!'));
        }
        return redirect()->back()->with('error', __('Unable to delete Role. Please try again!'));
    }
}
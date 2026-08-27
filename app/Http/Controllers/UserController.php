<?php
namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $authUser     = Auth::user();
        $authUserRole = $authUser->roles->first()?->name;
        // Allow superadmin, admin, product-manager, contact-manager, viewer
        if (!$authUser->hasPermissionTo('manage-users')) {
            abort(403, 'Unauthorized Access Prevented');
        }

        $userQuery = User::withPermissionCheck()->with(['roles', 'creator'])->latest();
        # Superadmin should not see other superadmins
        if ($authUserRole === 'superadmin') {
            $userQuery->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'superadmin');
            });
        }
        
        // Filter users based on user type
        if ($authUserRole === 'company') {
            // Company users can only see users they created
            $userQuery->where('created_by', $authUser->id);
        } elseif ($authUser->type !== 'superadmin') {
            // Non-company, non-superadmin users can only see users created by their creator
            $userQuery->where('created_by', $authUser->created_by);
        }

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $userQuery->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Handle role filter
        if ($request->has('role') && $request->role !== 'all') {
            $userQuery->whereHas('roles', function($q) use ($request) {
                $q->where('roles.id', $request->role);
            });
        }

        // Handle sorting
        $allowedSortFields = ['name', 'email', 'created_at', 'last_login_at', 'status', 'id'];
        $sortField = $request->input('sort_field', 'created_at');
        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }
        
        $sortDirection = $request->input('sort_direction', 'desc');
        if (!in_array(strtolower($sortDirection), ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        $userQuery->orderBy($sortField, $sortDirection);

        // Handle pagination
        $perPage = $request->has('per_page') ? (int)$request->per_page : 10;
        $users = $userQuery->paginate($perPage)->withQueryString();

        # Roles listing - Filter roles based on user type
        if ($authUserRole == 'superadmin') {
            // Superadmin can assign any role
            $roles = Role::get();
        } elseif ($authUser->type == 'company') {
            $roles = Role::whereNotIn('name', ['superadmin', 'company'])
                ->where(function ($query) use ($authUser) {
                    $query->where('created_by', $authUser->id)
                        ->orWhere('created_by', $authUser->created_by);
                })
                ->get();
            // If company has no custom roles yet, provision a safe default merchant role so the select is never empty
            if ($roles->isEmpty()) {
                $roles = $this->ensureDefaultMerchantRoles($authUser);
            }
        } else {
            // Sub-users can only assign roles created by their creator
            $roles = Role::whereNotIn('name', ['superadmin', 'company'])
                ->where('created_by', $authUser->created_by)
                ->get();
            if ($roles->isEmpty() && $authUser->created_by) {
                $creator = \App\Models\User::find($authUser->created_by);
                if ($creator) {
                    $roles = $this->ensureDefaultMerchantRoles($creator);
                }
            }
        }

        // Get plan limits for current store
        $planLimits = null;
        $currentStoreId = $authUser->current_store;
        if ($currentStoreId && $authUser->plan) {
            $currentUserCount = User::where('current_store', $currentStoreId)
                ->where('type', '!=', 'company')
                ->count();
            $maxUsers = $authUser->plan->max_users_per_store ?? $authUser->plan->max_users ?? 0;
            $planLimits = [
                'current_users' => $currentUserCount,
                'max_users' => $maxUsers,
                'can_create' => $currentUserCount < $maxUsers
            ];
        }
        
        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
            'planLimits' => $planLimits,
            'filters' => [
                'search' => $request->search ?? '',
                'role' => $request->role ?? 'all',
                'per_page' => $perPage,
                'sort_field' => $request->sort_field ?? 'created_at',
                'sort_direction' => $request->sort_direction ?? 'desc',
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(UserRequest $request)
    {
        // Set user language same as creator (company)
        $authUser = Auth::user();
        
        $userLang = ($authUser && $authUser->lang) ? $authUser->lang : 'ar';
        // Check if user can add more users to current store
        $currentStoreId = $authUser->current_store;
        if ($currentStoreId) {
            $userCheck = $authUser->canAddUserToStore($currentStoreId);
            if (!$userCheck['allowed']) {
                return redirect()->back()->with('error', $userCheck['message']);
            }
        }
        
        if (!in_array(auth()->user()->type, ['superadmin', 'company'])) {
            $created_by = auth()->user()->created_by;
        } else {
            $created_by = auth()->id();
        }
        
        $user = User::forceCreate([
            'name'       => $request->name,
            'email'      => $request->email,
            'phone'      => $request->phone,
            'password'   => Hash::make($request->password),
            'created_by' => $created_by,
            'lang'       => $userLang,
        ]);

        // current_store is guarded against mass assignment; assign explicitly.
        if ($authUser->current_store) {
            $user->current_store = $authUser->current_store;
            $user->save();
        }

        if ($user && $request->roles) {
            // Convert role names to IDs for syncing - validate role access
            $roleQuery = Role::where('id', $request->roles);
            
            if ($authUser->type === 'company') {
                // Company users can only assign roles they created or roles
                // created by the platform account that created them
                $roleQuery->where(function ($query) use ($authUser) {
                    $query->where('created_by', $authUser->id)
                        ->orWhere('created_by', $authUser->created_by);
                });
            } elseif ($authUser->type !== 'superadmin' && $authUser->type !== 'company') {
                // Sub-users can only assign roles created by their creator
                $roleQuery->where('created_by', $authUser->created_by);
            }
            
            $role = $roleQuery->first();
            if (!$role) {
                $user->delete();
                return redirect()->back()->with('error', __('Invalid role selection'));
            }
            if (in_array($role->name, ['superadmin', 'company'], true)) {
                $user->delete();
                abort(403, 'Cannot assign system role');
            }
            // Staff cannot grant permissions they do not have
            if (!$authUser->isSuperAdmin() && $authUser->type !== 'company') {
                $rolePerms = $role->permissions->pluck('name')->toArray();
                $actorPerms = $authUser->getAllPermissions()->pluck('name')->toArray();
                $extra = array_diff($rolePerms, $actorPerms);
                if (!empty($extra)) {
                    $user->delete();
                    abort(403, 'Cannot grant permissions you do not have');
                }
            }
            
            $user->roles()->sync([$role->id]);
            $user->type = $role->name;
            $user->save();
            
            // Trigger email notification only when requested
            if ($request->input('send_credentials', true)) {
                event(new \App\Events\UserCreated($user, $request->password));
            }
            
            // Check for email errors
            if (session()->has('email_error')) {
                return redirect()->route('users.index')->with('warning', __('User created successfully, but welcome email failed: ') . session('email_error'));
            }
            
            return redirect()->route('users.index')->with('success', __('User created with roles'));
        }
        return redirect()->back()->with('error', __('Unable to create User. Please try again!'));
    }

    /**
     * Ensure actor is authorized to manage target user (tenant scope).
     * Returns 403 if cross-company, targets superadmin, or staff targets owner.
     */
    private function authorizeUserTarget(User $actor, User $target): void
    {
        // Block targeting superadmin ever (except superadmin acting on non-superadmin per index rule)
        if ($target->type === 'superadmin' || $target->hasRole('superadmin')) {
            abort(403, 'Cannot manage superadmin user');
        }

        if ($actor->isSuperAdmin()) {
            // Superadmin can manage company/staff users globally (but not other superadmins - blocked above)
            return;
        }

        if ($actor->type === 'company') {
            if ((int) $target->created_by !== (int) $actor->id) {
                abort(403, 'Unauthorized to manage user outside your tenant');
            }
            return;
        }

        // Staff / sub-user
        if ((int) $target->created_by !== (int) $actor->created_by) {
            abort(403, 'Unauthorized to manage user outside your tenant');
        }

        // Staff must never target company owner
        if ($target->type === 'company') {
            abort(403, 'Staff cannot manage company owner');
        }

        // Staff cannot self-target via this path for privilege escalation? Allow self profile via separate flow, but block here if needed
        // (self-update would be captured; we allow but role escalation is handled in update logic)
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequest $request, User $user)
    {
        $this->authorizeUserTarget(Auth::user(), $user);

        if ($user) {
            $user->name  = $request->name;
            $user->email = $request->email;
            $user->phone = $request->phone;            

            // find and syncing role
            if ($request->roles) {
                if (!in_array(auth()->user()->type, ['superadmin', 'company'])) {
                    $created_by = auth()->user()->created_by;
                } else {
                    $created_by = auth()->id();
                }
                $roleQuery = Role::where('id', $request->roles);
                
                if (auth()->user()->type === 'company') {
                    // Company users can only assign roles they created or roles
                    // created by the platform account that created them
                    $roleQuery->where(function ($query) use ($created_by) {
                        $query->where('created_by', $created_by)
                            ->orWhere('created_by', auth()->user()->created_by);
                    });
                } elseif (auth()->user()->type !== 'superadmin' && auth()->user()->type !== 'company') {
                    // Sub-users can only assign roles created by their creator
                    $roleQuery->where('created_by', auth()->user()->created_by);
                }
                
                $role = $roleQuery->first();

                if (!$role) {
                    return redirect()->back()->with('error', __('Invalid role selection'));
                }

                // Prevent assigning system roles via id spoofing
                if (in_array($role->name, ['superadmin', 'company'], true)) {
                    abort(403, 'Cannot assign system role');
                }
                // Staff cannot grant permissions they do not have
                if (!Auth::user()->isSuperAdmin() && Auth::user()->type !== 'company') {
                    $rolePerms = $role->permissions->pluck('name')->toArray();
                    $actorPerms = Auth::user()->getAllPermissions()->pluck('name')->toArray();
                    $extra = array_diff($rolePerms, $actorPerms);
                    if (!empty($extra)) {
                        abort(403, 'Cannot grant permissions you do not have');
                    }
                }
                
                $user->roles()->sync([$role->id]);
                $user->type = $role->name;
            }

            $user->save();
            return redirect()->route('users.index')->with('success', __('User updated with roles'));
        }
        return redirect()->back()->with('error', __('Unable to update User. Please try again!'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        $this->authorizeUserTarget(Auth::user(), $user);

        if ($user) {
            // Prevent deleting yourself
            if ((int) $user->id === (int) Auth::id()) {
                return redirect()->back()->with('error', __('Cannot delete your own account'));
            }

            $user->delete();
            return redirect()->route('users.index')->with('success', __('User deleted with roles'));
        }
        return redirect()->back()->with('error', __('Unable to delete User. Please try again!'));
    }

    /**
     * Reset user password
     */
    public function resetPassword(Request $request, User $user)
    {
        $this->authorizeUserTarget(Auth::user(), $user);

        $request->validate([
            'password' => 'required|min:8|confirmed',
        ]);

        $user->password = Hash::make($request->password);
        $user->save();

        return redirect()->route('users.index')->with('success', __('Password reset successfully'));
    }

    /**
     * Ensure at least one safe merchant-assignable role exists for a company.
     * Creates a default "طاقم المتجر" role with limited permissions if none exists.
     */
    private function ensureDefaultMerchantRoles(User $company): \Illuminate\Support\Collection
    {
        $existing = Role::whereNotIn('name', ['superadmin', 'company'])
            ->where('created_by', $company->id)
            ->get();
        if ($existing->isNotEmpty()) {
            return $existing;
        }
        // Create a safe default role with view/manage orders & products only — never system perms
        try {
            $safePerms = \Spatie\Permission\Models\Permission::whereIn('name', [
                'view-products','view-orders','view-customers','manage-orders','view-analytics',
            ])->pluck('id')->toArray();
            $role = Role::create([
                'name' => 'store-staff-' . $company->id,
                'label' => 'طاقم المتجر',
                'description' => 'دور افتراضي للموظفين',
                'guard_name' => 'web',
                'created_by' => $company->id,
            ]);
            if (!empty($safePerms)) {
                $role->syncPermissions($safePerms);
            }
            return collect([$role]);
        } catch (\Throwable $e) {
            return collect();
        }
    }

    /**
     * Toggle user status
     */
    public function toggleStatus(User $user)
    {
        $this->authorizeUserTarget(Auth::user(), $user);

        // Prevent toggling your own status or owner's status by staff (already blocked) but double-guard company self
        if ((int) $user->id === (int) Auth::id()) {
            return redirect()->back()->with('error', __('Cannot change your own status'));
        }

        $user->status = $user->status === 'active' ? 'inactive' : 'active';
        $user->save();

        return redirect()->route('users.index')->with('success', __('User status updated successfully'));
    }
    

}
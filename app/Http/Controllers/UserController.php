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
        $allowedSortFields = ['name', 'email', 'created_at', 'status', 'id'];
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
        if ($authUserRole == 'company') {
            // Company users can only see roles they created (exclude system roles)
            $roles = Role::where('created_by', $authUser->id)
                ->whereNotIn('name', ['superadmin', 'company'])
                ->get();
        } elseif ($authUser->type !== 'superadmin') {
            // Non-company, non-superadmin users can only see roles created by their creator
            $roles = Role::where('created_by', $authUser->created_by)
                ->whereNotIn('name', ['superadmin', 'company'])
                ->get();
        } else {
            $roles = Role::get();
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
        
        $userLang = ($authUser && $authUser->lang) ? $authUser->lang : 'en';
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
        
        $user = User::create([
            'name'       => $request->name,
            'email'      => $request->email,
            'password'   => Hash::make($request->password),
            'created_by' => $created_by,
            'lang'       => $userLang,
            'current_store' => $authUser->current_store,
        ]);

        if ($user && $request->roles) {
            // Convert role names to IDs for syncing - validate role access
            $roleQuery = Role::where('id', $request->roles);
            
            if ($authUser->type === 'company') {
                // Company users can only assign roles they created
                $roleQuery->where('created_by', $authUser->id);
            } elseif ($authUser->type !== 'superadmin' && $authUser->type !== 'company') {
                // Sub-users can only assign roles created by their creator
                $roleQuery->where('created_by', $authUser->created_by);
            }
            
            $role = $roleQuery->first();
            
            $user->roles()->sync([$role->id]);
            $user->type = $role->name;
            $user->save();
            
            // Trigger email notification
            event(new \App\Events\UserCreated($user, $request->password));
            
            // Check for email errors
            if (session()->has('email_error')) {
                return redirect()->route('users.index')->with('warning', __('User created successfully, but welcome email failed: ') . session('email_error'));
            }
            
            return redirect()->route('users.index')->with('success', __('User created with roles'));
        }
        return redirect()->back()->with('error', __('Unable to create User. Please try again!'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequest $request, User $user)
    {
        if ($user) {
            $user->name  = $request->name;
            $user->email = $request->email;            

            // find and syncing role
            if ($request->roles) {
                if (!in_array(auth()->user()->type, ['superadmin', 'company'])) {
                    $created_by = auth()->user()->created_by;
                } else {
                    $created_by = auth()->id();
                }
                $roleQuery = Role::where('id', $request->roles);
                
                if (auth()->user()->type === 'company') {
                    // Company users can only assign roles they created
                    $roleQuery->where('created_by', auth()->id());
                } elseif (auth()->user()->type !== 'superadmin' && auth()->user()->type !== 'company') {
                    // Sub-users can only assign roles created by their creator
                    $roleQuery->where('created_by', auth()->user()->created_by);
                }
                
                $role = $roleQuery->first();
                
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
        if ($user) {
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
        $request->validate([
            'password' => 'required|min:8|confirmed',
        ]);

        $user->password = Hash::make($request->password);
        $user->save();

        return redirect()->route('users.index')->with('success', __('Password reset successfully'));
    }

    /**
     * Toggle user status
     */
    public function toggleStatus(User $user)
    {
        $user->status = $user->status === 'active' ? 'inactive' : 'active';
        $user->save();

        return redirect()->route('users.index')->with('success', __('User status updated successfully'));
    }
    

}
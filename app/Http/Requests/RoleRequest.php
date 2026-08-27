<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Permission;
use Illuminate\Support\Facades\Auth;

class RoleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'label' => ['required', 'string', function ($attribute, $value, $fail) {
                $this->validateSystemRole($value, $fail);
            }],
            'description' => 'nullable|string',
            'permissions' => 'required|array',
            'permissions.*' => ['string', 'exists:permissions,name', function ($attribute, $value, $fail) {
                $this->validatePermissionAccess($value, $fail);
            }]
        ];
    }

    /**
     * Validate that user can assign this permission — grant-what-you-have
     */
    private function validatePermissionAccess($permissionName, $fail)
    {
        $user = Auth::user();
        if (!$user) {
            $fail('Unauthenticated');
            return;
        }
        $userType = $user->type ?? 'company';

        // Superadmin can assign any permission
        if ($userType === 'superadmin') {
            return;
        }

        // Check allowed modules first
        $allowedModules = config('role-permissions.' . $userType, config('role-permissions.company'));
        $permission = Permission::where('name', $permissionName)->first();

        if ($permission && !in_array($permission->module, $allowedModules)) {
            $fail('You are not authorized to assign this permission.');
            return;
        }

        // Grant-what-you-have: actor must actually possess the permission they try to grant
        // (company owners are seeded with most perms, but custom staff may have limited set)
        if ($permission && !$user->hasPermissionTo($permissionName)) {
            // Allow company type to still create broad roles? No — phase 2 strictly enforces grant-what-you-have for non-superadmin.
            // Company owner is still bound; if they need a perm they must have it first (they do via seeded company role).
            $fail('You cannot grant a permission you do not possess: ' . $permissionName);
        }
    }

    /**
     * Validate that system roles cannot be created/modified
     */
    private function validateSystemRole($label, $fail)
    {
        $user = Auth::user();
        $userType = $user->type ?? 'company';
        
        // Superadmin can create/edit any role
        if ($userType === 'superadmin' || $userType === 'superadmin') {
            return;
        }
        
        $systemRoles = ['superadmin', 'superadmin', 'company'];
        $slug = \Illuminate\Support\Str::slug($label);
        
        if (in_array(strtolower($label), array_map('strtolower', $systemRoles)) || 
            in_array($slug, $systemRoles)) {
            $fail('This role name is reserved for system use. Please choose a different name.');
        }
    }
}

// utils/permissions.ts
import { usePage } from '@inertiajs/react';

/**
 * Check if the current user has a specific permission
 * @param permission The permission name to check
 * @returns boolean indicating if the user has the permission
 */
export const hasPermission = (permission: string): boolean => {
  const { auth } = usePage().props as any;
  
  if (!auth || !auth.user || !auth.permissions) {
    return false;
  }
  
  // Check if user has the specific permission
  return auth.permissions.includes(permission);
};

/**
 * Check if the current user has any of the specified permissions
 * @param permissions Array of permission names to check
 * @returns boolean indicating if the user has any of the permissions
 */
export const hasAnyPermission = (permissions: string[]): boolean => {
  const { auth } = usePage().props as any;
  
  if (!auth || !auth.user || !auth.permissions) {
    return false;
  }
  
  // Check if user has any of the permissions
  return permissions.some(permission => auth.permissions.includes(permission));
};

/**
 * Check if user has permission and show error if not
 * @param permission The permission name to check
 * @param auth Auth object from usePage
 * @param errorMessage Custom error message (optional)
 * @returns boolean indicating if the user has the permission
 */
export const checkPermission = (permission: string, auth: any, errorMessage?: string): boolean => {
  if (!auth || !auth.user || !auth.permissions) {
    return false;
  }
  
  const hasAccess = auth.permissions.includes(permission);
  
  if (!hasAccess) {
    // Import toast dynamically to avoid circular dependency
    import('../components/custom-toast').then(({ toast }) => {
      toast.error(
        errorMessage || 'Permission denied. You do not have access to this feature.'
      );
    });
  }
  
  return hasAccess;
};

/**
 * Non-hook version for use in event handlers
 * @param permission The permission name to check
 * @param auth Auth object from usePage
 * @returns boolean indicating if the user has the permission
 */
export const checkPermissionWithAuth = (permission: string, auth: any): boolean => {
  if (!auth || !auth.user || !auth.permissions) {
    return false;
  }
  
  return auth.permissions.includes(permission);
};
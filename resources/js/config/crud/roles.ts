// config/crud/roles.ts
import { CrudConfig } from '@/types/crud';
import { columnRenderers } from '@/utils/columnRenderers';
import { ShieldAlert } from 'lucide-react';
import { createElement } from 'react';
import i18n from 'i18next';

const t = (key: string, options?: any) => i18n.t(key, options);

export const rolesConfig: CrudConfig = {
  entity: {
    name: 'roles',
    endpoint: route('roles.index'),
    searchPlaceholder: 'ابحث باسم الدور أو الوصف...',
    permissions: {
      view: 'view-roles',
      create: 'create-roles',
      edit: 'edit-roles',
      delete: 'delete-roles'
    }
  },
  modalSize: '5xl',
  description: t('Manage user roles and their permissions'),
  table: {
    columns: [
      { key: 'label', label: t('Name'), sortable: true },
      { key: 'name', label: t('Slug'), sortable: true },
      { key: 'description', label: t('Description') },
      { 
        key: 'creator.name', 
        label: t('Created By'), 
        render: (value, row) => row.creator?.name || t('System')
      },
      { 
        key: 'created_at', 
        label: t('Created At'), 
        sortable: true, 
        render: columnRenderers.date() 
      }
      // Permissions column will be added dynamically in the Roles component
    ],
    actions: [
      { 
        label: t('View'), 
        icon: 'Eye', 
        action: 'view', 
        className: 'text-blue-500',
        requiredPermission: 'view-roles'
      },
      { 
        label: t('Edit'), 
        icon: 'Edit', 
        action: 'edit', 
        className: 'text-amber-500',
        requiredPermission: 'edit-roles'
      },
      { 
        label: t('Delete'), 
        icon: 'Trash2', 
        action: 'delete', 
        className: 'text-red-500',
        requiredPermission: 'delete-roles',
        condition: (row) => !row.is_system_role
      }
    ],
    emptyState: {
      icon: createElement(ShieldAlert, { className: 'h-12 w-12 text-muted-foreground' }),
      title: 'لا توجد أدوار مضافة حالياً',
      description: 'ابدأ بإنشاء دور جديد ثم حدد صلاحياته حسب الحاجة.',
      actionLabel: 'إضافة دور جديد',
      actionPermission: 'create-roles'
    }
  },
  filters: [],
  form: {
    fields: [
      { name: 'label', label: t('Role Name'), type: 'text', required: true },
      { name: 'description', label: t('Description'), type: 'textarea' }
      // Permissions field will be added dynamically in the Roles component
    ]
  }
};
// components/PageCrudWrapper.tsx
import { useState, useEffect, ReactNode } from 'react';
import { PageTemplate, PageAction } from '@/components/page-template';
import { PlusIcon, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from './CrudTable';
import { CrudFormModal } from './CrudFormModal';
import { CrudDeleteModal } from './CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { CrudConfig } from '@/types/crud';
import { BreadcrumbItem } from '@/types';
import { useTranslation } from 'react-i18next';

export interface CrudButton {
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick?: () => void;
  permission?: string;
  className?: string;
  showAddButton?: boolean;
}

interface PageCrudWrapperProps {
  config: CrudConfig;
  title?: string;
  url: string;
  buttons?: CrudButton[];
  breadcrumbs?: BreadcrumbItem[];
}

export function PageCrudWrapper({ 
  config, 
  title, 
  url,
  buttons = [],
  breadcrumbs
}: PageCrudWrapperProps) {
  const { t } = useTranslation();
  const { entity, table, filters = [], form, hooks } = config;
  const { auth, ...pageProps } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // Human-readable Arabic label for the entity, used inside translated phrases.
  const ENTITY_LABELS: Record<string, string> = {
    users: t('User'),
    coupons: t('Coupon'),
    categories: t('Category'),
    currencies: t('Currency'),
    permissions: t('Permission'),
    roles: t('Role'),
    products: t('Product'),
    'plan-orders': t('Plan Order'),
    'plan-requests': t('Plan Request'),
  };
  const entityLabel = ENTITY_LABELS[entity.name] || entity.name;
  
  // Get data from page props using entity name
  const data = pageProps[entity.name] || { data: [], links: [] };
  const pageFilters = pageProps.filters || {};
  
  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  
  // Initialize filter values from URL
  useEffect(() => {
    const initialFilters: Record<string, any> = {};
    filters.forEach(filter => {
      const filterKey = filter.key;
      initialFilters[filterKey] = pageFilters[filterKey] || '';
    });
    setFilterValues(initialFilters);
  }, []);
  
  // Check if any filters are active
  const hasActiveFilters = () => {
    return Object.entries(filterValues).some(([key, value]) => {
      return value && value !== '';
    }) || searchTerm !== '';
  };
  
  // Count active filters
  const activeFilterCount = () => {
    return Object.entries(filterValues).filter(([key, value]) => {
      return value && value !== '';
    }).length + (searchTerm ? 1 : 0);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };
  
  const applyFilters = () => {
    const params: any = { page: 1 };
    
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    // Add filter values to params
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== '') {
        params[key] = value;
      }
    });
    
    // Add per_page if it exists
    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }
    
    router.get(entity.endpoint, params, { preserveState: true, preserveScroll: true });
  };
  
  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    
    const params: any = { page: 1 };
    
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    // Add all current filter values
    const newFilters = { ...filterValues, [key]: value };
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v && v !== '') {
        params[k] = v;
      }
    });
    
    // Add per_page if it exists
    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }
    
    router.get(entity.endpoint, params, { preserveState: true, preserveScroll: true });
  };
  
  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    
    const params: any = { 
      sort_field: field, 
      sort_direction: direction, 
      page: 1 
    };
    
    // Add search and filters
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== '') {
        params[key] = value;
      }
    });
    
    // Add per_page if it exists
    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }
    
    router.get(entity.endpoint, params, { preserveState: true, preserveScroll: true });
  };
  
  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);
    
    switch (action) {
      case 'view':
        setFormMode('view');
        setIsFormModalOpen(true);
        break;
      case 'edit':
        setFormMode('edit');
        setIsFormModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      default:
        break;
    }
  };
  
  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };
  
  const handleFormSubmit = (formData: any) => {
    // Make a copy of the form data to avoid modifying the original
    const processedFormData = { ...formData };
    
    // For roles, create a simplified object with only the required fields
    if (entity.name === 'roles') {
      // Extract permission names from the permissions array if they're objects
      if (processedFormData.permissions && Array.isArray(processedFormData.permissions)) {
        const permissionNames = processedFormData.permissions.map((p: any) => {
          if (typeof p === 'object' && p !== null && p.name) {
            return p.name;
          }
          return String(p);
        });
        processedFormData.permissions = permissionNames;
      }
      
      // Reset the object with only the fields we need
      const cleanData = {
        label: processedFormData.label,
        description: processedFormData.description || '',
        permissions: processedFormData.permissions || []
      };
      
      // Replace all properties
      Object.keys(processedFormData).forEach(key => {
        delete processedFormData[key];
      });
      
      Object.assign(processedFormData, cleanData);
    }
    // Fix permissions format for other entities
    else if (processedFormData.permissions && Array.isArray(processedFormData.permissions)) {
      const permissionsObj: Record<string, string> = {};
      processedFormData.permissions.forEach((id: any, index: any) => {
        permissionsObj[index] = String(id);
      });
      processedFormData.permissions = permissionsObj;
    }
    
    // Ensure we're not sending the name field for permissions as it's auto-generated
    if (entity.name === 'permissions' && formMode === 'edit') {
      delete processedFormData.name;
    }
    
    // Check if this entity has file uploads
    const hasFileFields = form.fields.some(field => field.type === 'file');
    
    if (hasFileFields) {
      // Get file field names
      const fileFields = form.fields
        .filter(field => field.type === 'file')
        .map(field => field.name);
      
      // Use FormData for file uploads
      const formDataObj = new FormData();
      
      // Add all fields to FormData
      Object.keys(processedFormData).forEach(key => {
        // For file fields in edit mode
        if (fileFields.includes(key) && formMode === 'edit') {
          // Only include the file if a new one was selected
          if (processedFormData[key] && typeof processedFormData[key] === 'object') {
            formDataObj.append(key, processedFormData[key]);
          }
          // Otherwise skip this field - don't send empty file fields
          return;
        }
        formDataObj.append(key, processedFormData[key]);
      });
      
      if (formMode === 'create') {
        // Show loading toast
        toast.loading(t('Creating...'));
        
        router.post(entity.endpoint, formDataObj, {
          onSuccess: (page) => {
            setIsFormModalOpen(false);
            toast.dismiss();
            if (hooks?.afterCreate) {
              hooks.afterCreate(formData, page.props[entity.name]);
            }
          },
          onError: (errors) => {
            toast.dismiss();
            toast.error(t('Failed to create {{entity}}: {{errors}}', { entity: entityLabel, errors: Object.values(errors).join(', ') }));
          }
        });
      } else if (formMode === 'edit') {
        // Show loading toast
        toast.loading(t('Updating...'));
        
        router.post(`${entity.endpoint}/${currentItem.id}?_method=PUT`, formDataObj, {
          onSuccess: (page) => {
            setIsFormModalOpen(false);
            toast.dismiss();
            if (hooks?.afterUpdate) {
              hooks.afterUpdate(formData, page.props[entity.name]);
            }
          },
          onError: (errors) => {
            toast.dismiss();
            toast.error(t('Failed to update {{entity}}: {{errors}}', { entity: entityLabel, errors: Object.values(errors).join(', ') }));
          }
        });
      }
      return;
    }
    
    if (formMode === 'create') {
      // Show loading toast
      toast.loading(t('Creating...'));
      
      router.post(entity.endpoint, processedFormData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          toast.dismiss();
          if (hooks?.afterCreate) {
            hooks.afterCreate(formData, page.props[entity.name]);
          }
        },
        onError: (errors) => {
          toast.dismiss();
          toast.error(t('Failed to create {{entity}}: {{errors}}', { entity: entityLabel, errors: Object.values(errors).join(', ') }));
        }
      });
    } else if (formMode === 'edit') {
      // Show loading toast
      toast.loading(t('Updating...'));
      
      router.put(`${entity.endpoint}/${currentItem.id}`, processedFormData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          toast.dismiss();
          if (hooks?.afterUpdate) {
            hooks.afterUpdate(formData, page.props[entity.name]);
          }
        },
        onError: (errors) => {
          toast.dismiss();
          toast.error(t('Failed to update {{entity}}: {{errors}}', { entity: entityLabel, errors: Object.values(errors).join(', ') }));
        }
      });
    }
  };
  
  const handleDeleteConfirm = () => {
    // Show loading toast
    toast.loading(t('Deleting...'));
    
    router.delete(`${entity.endpoint}/${currentItem.id}`, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        toast.dismiss();
        if (hooks?.afterDelete) {
          hooks.afterDelete(currentItem.id);
        }
      },
      onError: (errors) => {
        toast.dismiss();
        toast.error(t('Failed to delete {{entity}}: {{errors}}', { entity: entityLabel, errors: Object.values(errors).join(', ') }));
      }
    });
  };
  
  const handleResetFilters = () => {
    // Reset all filters to default values
    const resetFilters: Record<string, any> = {};
    filters.forEach(filter => {
      resetFilters[filter.key] = filter.type === 'select' ? 'all' : '';
    });
    
    setFilterValues(resetFilters);
    setSearchTerm('');
    setShowFilters(false);
    
    router.get(entity.endpoint, { 
      page: 1, 
      per_page: pageFilters.per_page 
    }, { preserveState: true, preserveScroll: true });
  };

  // Check if we should show the add button
  const showAddButton = buttons.every(button => button.showAddButton !== false);

  // Define page actions
  const pageActions: PageAction[] = [];
  
  // Add custom buttons with permission check
  buttons.forEach(button => {
    if (!button.permission || hasPermission(permissions, button.permission)) {
      pageActions.push({
        label: button.label,
        icon: button.icon,
        variant: button.variant,
        onClick: button.onClick
      });
    }
  });

  // Add the default "Add New" button if allowed and user has permission
  if (showAddButton && hasPermission(permissions, entity.permissions.create)) {
    pageActions.push({
      label: t('Add New {{entity}}', { entity: entityLabel }),
      icon: <PlusIcon className="h-4 w-4" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const pageTitle = title || entity.name.charAt(0).toUpperCase() + entity.name.slice(1);

  // Generate default breadcrumbs if not provided
  const defaultBreadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: pageTitle }
  ];

  const pageBreadcrumbs = breadcrumbs || defaultBreadcrumbs;

  return (
    <PageTemplate 
      title={pageTitle} 
      url={url}
      actions={pageActions}
      breadcrumbs={pageBreadcrumbs}
      noPadding
    >
      {/* Search and filters section */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={entity.searchPlaceholder || t("Search") + " " + entity.name + "..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full ps-9"
                  />
                </div>
                <Button type="submit" size="sm">
                  <Search className="h-4 w-4 me-1.5" />
                  {t("Search")}
                </Button>
              </form>
              
              {filters.length > 0 && (
                <div className="ms-2">
                  <Button 
                    variant={hasActiveFilters() ? "default" : "outline"}
                    size="sm" 
                    className="h-8 px-2 py-1"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-3.5 w-3.5 me-1.5" />
                    {showFilters ? t('Hide Filters') : t('Filters')}
                    {hasActiveFilters() && (
                      <span className="ms-1 bg-primary-foreground text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        {activeFilterCount()}
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{t("Per Page")}:</Label>
              <Select 
                value={pageFilters.per_page?.toString() || "10"} 
                onValueChange={(value) => {
                  const params: any = { page: 1, per_page: parseInt(value) };
                  
                  if (searchTerm) {
                    params.search = searchTerm;
                  }
                  
                  Object.entries(filterValues).forEach(([key, val]) => {
                    if (val && val !== '') {
                      params[key] = val;
                    }
                  });
                  
                  router.get(entity.endpoint, params, { preserveState: true, preserveScroll: true });
                }}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {showFilters && filters.length > 0 && (
            <div className="w-full mt-3 p-4 bg-gray-50 border rounded-md">
              <div className="flex flex-wrap gap-4 items-end">
                {filters.map((filter) => {
                  const filterKey = filter.key;
                  return (
                    <div key={filterKey} className="space-y-2">
                      <Label>{filter.label}</Label>
                      {filter.type === 'select' && (
                        <Select 
                          value={filterValues[filterKey] || ''} 
                          onValueChange={(value) => handleFilterChange(filterKey, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder={`All ${filter.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {filter.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9"
                  onClick={handleResetFilters}
                  disabled={!hasActiveFilters()}
                >
                  {t("Reset Filters")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {data.data.length === 0 && table.emptyState ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
              {table.emptyState.icon || <ShieldAlert className="h-12 w-12 text-muted-foreground" />}
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{table.emptyState.title}</h3>
            {table.emptyState.description && (
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{table.emptyState.description}</p>
            )}
            {table.emptyState.actionLabel && hasPermission(permissions, table.emptyState.actionPermission || entity.permissions.create) && (
              <Button className="mt-6" onClick={handleAddNew}>
                <PlusIcon className="h-4 w-4 me-2" />
                {table.emptyState.actionLabel}
              </Button>
            )}
          </div>
        ) : (
          <CrudTable
            columns={table.columns}
            actions={table.actions}
            data={data.data}
            from={data.from || 1}
            onAction={handleAction}
            sortField={pageFilters.sort_field}
            sortDirection={pageFilters.sort_direction}
            onSort={handleSort}
            statusColors={table.statusColors}
            permissions={permissions}
            entityPermissions={entity.permissions}
          />
        )}

        {/* Pagination section */}
        <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {t("Showing {{from}} to {{to}} of {{total}} {{item}}", { from: data.from || 0, to: data.to || 0, total: data.total, item: entityLabel })}
          </div>
          
          <div className="flex flex-row items-center gap-1">
            {data.links?.map((link: any, i: number, arr: any[]) => {
              const isFirst = i === 0 && link.url;
              const isLast = i === arr.length - 1 && link.url;
              const isTextLink = isFirst || isLast;
              
              return (
                <Button
                  key={`pagination-${i}-${link.label}`}
                  variant={link.active ? 'default' : 'outline'}
                  size={isTextLink ? "sm" : "icon"}
                  className={cn(isTextLink ? "px-3 min-w-[40px] gap-1" : "h-8 w-8", "shrink-0")}
                  disabled={!link.url}
                  onClick={() => link.url && router.get(link.url)}
                >
                  {isFirst ? (
                    <span className="flex items-center gap-1">
                      <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                      <span className="hidden sm:inline">{t("Previous")}</span>
                    </span>
                  ) : isLast ? (
                    <span className="flex items-center gap-1">
                      <span className="hidden sm:inline">{t("Next")}</span>
                      <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                    </span>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          ...form,
          modalSize: config.modalSize || form.modalSize
        }}
        initialData={currentItem}
        title={
          formMode === 'create' 
            ? t('Add New {{entity}}', { entity: entityLabel }) 
            : formMode === 'edit' 
              ? t('Edit {{entity}}', { entity: entityLabel }) 
              : t('View {{entity}}', { entity: entityLabel })
        }
        mode={formMode}
        description={config.description}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName={entity.name.slice(0, -1)}
      />
    </PageTemplate>
  );
}
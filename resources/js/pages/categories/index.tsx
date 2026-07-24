import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Plus, RefreshCw, Download, Folder, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { getImageUrl } from '@/utils/image-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';

export default function Categories() {
  const { t } = useTranslation();
  const { categories, stats, auth } = usePage().props as any;
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);

  const handleActionClick = (action: string, permission: string, categoryId?: number) => {
    if (!checkPermission(permission, auth)) {
      return;
    }
    
    switch (action) {
      case 'view':
        router.visit(route('categories.show', categoryId));
        break;
      case 'edit':
        router.visit(route('categories.edit', categoryId));
        break;
      case 'delete':
        setCategoryToDelete(categoryId!);
        break;
      case 'create':
        router.visit(route('categories.create'));
        break;
      case 'export':
        window.open(route('categories.export'), '_blank');
        break;
    }
  };
  
  const handleDelete = () => {
    if (categoryToDelete && checkPermission('delete-categories', auth)) {
      router.delete(route('categories.destroy', categoryToDelete));
      setCategoryToDelete(null);
    }
  };

  const pageActions = [
    ...(hasPermission('export-categories') ? [{
      label: t('Export'),
      icon: <Download className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => handleActionClick('export', 'export-categories')
    }] : []),
    ...(hasPermission('create-categories') ? [{
      label: t('Create Category'),
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleActionClick('create', 'create-categories')
    }] : [])
  ];

  return (
    <PageTemplate 
      title={t('Categories')}
      url="/categories"
      actions={pageActions}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('products.index') },
        { title: t('Categories') }
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Categories')}</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{t('All categories')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Active Categories')}</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                {t('{{percent}}% active rate', { percent: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0 })}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Parent Categories')}</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.parent}</div>
              <p className="text-xs text-muted-foreground">{t('Main categories')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Sub Categories')}</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sub}</div>
              <p className="text-xs text-muted-foreground">{t('Child categories')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Product Categories')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">{t('No categories found')}</p>
                  {hasPermission('create-categories') && (
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={() => handleActionClick('create', 'create-categories')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('Create your first category')}
                    </Button>
                  )}
                </div>
              ) : (
                categories.map((category: any) => (
                  <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border">
                        {category.image ? (
                          <img
                            src={getImageUrl(category.image)}
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <Folder className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{category.name}</h3>
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? t('Active') : t('Inactive')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">/{category.slug}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {t('{{count}} products', { count: category.products_count || 0 })}
                          </span>
                          {category.parent && (
                            <span className="text-xs text-muted-foreground">
                              {t('Parent: {{name}}', { name: category.parent.name })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {hasPermission('view-categories') && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleActionClick('view', 'view-categories', category.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('edit-categories') && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleActionClick('edit', 'edit-categories', category.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('delete-categories') && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleActionClick('delete', 'delete-categories', category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Category')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to delete this category? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryToDelete(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
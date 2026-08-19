import React, { useState, useEffect, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import {
  Upload, Search, Plus, Info, Copy, Download, Image as ImageIcon,
  Calendar, HardDrive, BarChart3, Eye, Trash2, List, LayoutGrid, ArrowDownWideNarrow,
} from 'lucide-react';
import { hasPermission } from '@/utils/authorization';

interface MediaItem {
  id: number;
  name: string;
  file_name: string;
  disk: string;
  mime_type: string;
  size: number;
  url: string;
  thumb_url: string;
  model_id: number;
  user_id: number;
  created_at: string;
}

type SortOption = 'newest' | 'oldest' | 'largest';
type ViewMode = 'grid' | 'list';

export default function MediaLibraryDemo() {
  const { t } = useTranslation();
  const { csrf_token, auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const canUploadMedia = hasPermission(permissions, 'upload-media');
  const canDeleteMedia = hasPermission(permissions, 'delete-media');
  const canDownloadMedia = hasPermission(permissions, 'download-media');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedMediaInfo, setSelectedMediaInfo] = useState<MediaItem | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [dimensions, setDimensions] = useState<Record<number, { w: number; h: number }>>({});
  const itemsPerPage = 12;

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(route('api.media.index'), {
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMedia(data);
      setFilteredMedia(data);
    } catch (error) {
      console.error('Failed to load media:', error);
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Search + sort
  useEffect(() => {
    let filtered = media.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortBy === 'newest') {
      filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      filtered = [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'largest') {
      filtered = [...filtered].sort((a, b) => b.size - a.size);
    }

    setFilteredMedia(filtered);
    setCurrentPage(1);
  }, [searchTerm, media, sortBy]);

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);

    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      setUploading(false);
      return;
    }

    const formData = new FormData();
    validFiles.forEach(file => {
      formData.append('files[]', file);
    });

    try {
      const response = await fetch(route('api.media.batch'), {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: {
          'X-CSRF-TOKEN': csrf_token,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setMedia(prev => [...result.data, ...prev]);
        toast.success(result.message);

        // Show individual errors if any
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: string) => {
            toast.error(error);
          });
        }
      } else {
        const serverMessage = result.message || result.error || '';
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: string) => {
            toast.error(error, { duration: 6000 });
          });
        } else if (serverMessage) {
          toast.error(serverMessage, { duration: 6000 });
        } else {
          toast.error(t('Failed to upload files'));
        }
      }
    } catch (error) {
      toast.error('Error uploading files');
    }

    setUploading(false);
    setIsUploadModalOpen(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const deleteMedia = async (id: number) => {
    try {
      const response = await fetch(route('api.media.destroy', id), {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          'X-CSRF-TOKEN': csrf_token,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (response.ok) {
        setMedia(prev => prev.filter(item => item.id !== id));
        setSelected(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success('Media deleted successfully');
      } else {
        toast.error('Failed to delete media');
      }
    } catch (error) {
      toast.error('Error deleting media');
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selected);

    try {
      const results = await Promise.allSettled(ids.map(id =>
        fetch(route('api.media.destroy', id), {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: {
            'X-CSRF-TOKEN': csrf_token,
            'X-Requested-With': 'XMLHttpRequest',
          },
        })
      ));

      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length;

      if (failed === 0) {
        toast.success(t('Deleted successfully'));
      } else {
        toast.error(t('Failed to delete some media'));
      }

      setMedia(prev => prev.filter(item => !selected.has(item.id)));
      setSelected(new Set());
    } catch (error) {
      toast.error('Error deleting media');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleImageLoad = (id: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    setDimensions(prev => (prev[id] ? prev : { ...prev, [id]: { w, h } }));
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Image URL copied to clipboard');
  };

  const handleDownload = (id: number, filename: string) => {
    const link = document.createElement('a');
    link.href = route('api.media.download', id);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  const handleShowInfo = (item: MediaItem) => {
    setSelectedMediaInfo(item);
    setInfoModalOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const totalPages = Math.ceil(filteredMedia.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentMedia = filteredMedia.slice(startIndex, startIndex + itemsPerPage);

  const imagesCount = filteredMedia.filter(item => item.mime_type.startsWith('image/')).length;
  const totalSize = filteredMedia.reduce((acc, item) => acc + item.size, 0);

  const sortLabelMap: Record<SortOption, string> = {
    newest: t('Newest'),
    oldest: t('Oldest'),
    largest: t('Largest'),
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Media Library') }
  ];

  const pageActions = [];

  if (canUploadMedia) {
    pageActions.push({
      label: t('Upload Media'),
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => setIsUploadModalOpen(true)
    });
  }

  const renderActionButtons = (item: MediaItem) => (
    <>
      {canDownloadMedia && (
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => handleDownload(item.id, item.file_name)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow-md transition hover:bg-white"
              aria-label={t('Download')}
            >
              <Download className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{t('Download')}</TooltipContent>
        </Tooltip>
      )}
      {canDeleteMedia && (
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => deleteMedia(item.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/90 text-white shadow-md transition hover:bg-red-600"
              aria-label={t('Delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{t('Delete')}</TooltipContent>
        </Tooltip>
      )}
    </>
  );

  const renderThumbnail = (item: MediaItem, className?: string) => (
    <img
      src={item.thumb_url}
      alt={item.name}
      loading="lazy"
      onLoad={(e) => handleImageLoad(item.id, e)}
      onError={(e) => {
        if (e.currentTarget.src !== item.url) {
          e.currentTarget.src = item.url;
        }
      }}
      className={className || 'w-full h-full object-contain'}
    />
  );

  const renderFileName = (item: MediaItem) => {
    const dims = dimensions[item.id];
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <h3 className="text-sm font-medium truncate max-w-[140px]" title={item.file_name}>
            {item.file_name}
          </h3>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-[260px]">
          <span dir="ltr" className="block break-all text-xs">{item.file_name}</span>
          {dims && (
            <span dir="ltr" className="mt-1 block text-xs font-semibold">
              {dims.w} × {dims.h}px
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <PageTemplate
      title={t('Media Library')}
      url="/media-library"
      breadcrumbs={breadcrumbs}
      actions={pageActions}
    >
      <div className="space-y-6">

        {/* Search, Stats and Toolbar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Section */}
              <div className="flex-1">
                <div className="relative max-w-sm">
                  <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    dir="rtl"
                    placeholder={t('Search media files by name...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ps-9 text-right"
                  />
                </div>
                {searchTerm && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('Showing results for "{{term}}"', { term: searchTerm })}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Sorting dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ArrowDownWideNarrow className="h-4 w-4" />
                      {sortLabelMap[sortBy]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy('newest')}>
                      {t('Newest')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                      {t('Oldest')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('largest')}>
                      {t('Largest')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Layout toggle (Grid / List) */}
                <div className="inline-flex items-center rounded-lg border p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title={t('Grid View')}
                    className={cn(
                      'rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground',
                      viewMode === 'grid' && 'bg-primary text-primary-foreground hover:text-primary-foreground'
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    title={t('List View')}
                    className={cn(
                      'rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground',
                      viewMode === 'list' && 'bg-primary text-primary-foreground hover:text-primary-foreground'
                    )}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                {/* Stats */}
                <div className="flex gap-5 items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-md">
                      <ImageIcon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">{t('Images: {{count}}', { count: imagesCount })}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500/10 rounded-md">
                      <HardDrive className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap" dir="ltr">
                      {formatFileSize(totalSize)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-md">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">{t('Files: {{count}}', { count: filteredMedia.length })}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batch selection bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <span className="text-sm font-medium">
              {t('{{count}} selected', { count: selected.size })}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>
                {t('Clear Selection')}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ms-2"></div>
                    {t('Deleting...')}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 ms-2" />
                    {t('Delete Selected')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Media Grid */}
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t('Loading media...')}</p>
              </div>
            ) : currentMedia.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('No media files found')}</h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm ? t('No results found for "{{term}}"', { term: searchTerm }) : t('Get started by uploading your first media file')}
                </p>
                {!searchTerm && canUploadMedia && (
                  <Button
                    onClick={() => setIsUploadModalOpen(true)}
                    size="lg"
                  >
                    <Plus className="h-4 w-4 ms-2" />
                    {t('Upload Media')}
                  </Button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 w-full">
                {currentMedia.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'group relative flex flex-col bg-card border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200',
                      selected.has(item.id) && 'ring-2 ring-primary border-primary'
                    )}
                  >
                    {/* Image Container */}
                    <div className="relative aspect-square bg-gray-50 rounded-lg border overflow-hidden flex items-center justify-center p-2">
                      {renderThumbnail(item)}

                      {/* Selection checkbox */}
                      <div className="absolute top-2 start-2 z-10">
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={(checked) => toggleSelect(item.id, checked === true)}
                          aria-label="Select"
                          className="bg-white/90 border-gray-300 data-[state=checked]:bg-primary"
                        />
                      </div>

                      {/* Hover overlay quick actions */}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-2 pb-2 pt-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => handleShowInfo(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow-md transition hover:bg-white"
                              aria-label={t('View Info')}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{t('View Info')}</TooltipContent>
                        </Tooltip>
                        {renderActionButtons(item)}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 space-y-2 flex-1">
                      {renderFileName(item)}
                      <p className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                        <HardDrive className="h-3 w-3 shrink-0" />
                        {formatFileSize(item.size)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List view */
              <div className="divide-y rounded-lg border">
                {currentMedia.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 p-3 transition-colors',
                      selected.has(item.id) && 'bg-primary/5'
                    )}
                  >
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={(checked) => toggleSelect(item.id, checked === true)}
                      aria-label="Select"
                    />
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-gray-50 p-1">
                      {renderThumbnail(item, 'w-full h-full object-contain')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {renderFileName(item)}
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          {item.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                        </Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span dir="ltr">{formatFileSize(item.size)}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleShowInfo(item)}
                        aria-label={t('View Info')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canDownloadMedia && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownload(item.id, item.file_name)}
                          aria-label={t('Download')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteMedia && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteMedia(item.id)}
                          aria-label={t('Delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  {t('Showing')} <span className="font-semibold">{startIndex + 1}</span> {t('to')} <span className="font-semibold">{Math.min(startIndex + itemsPerPage, filteredMedia.length)}</span> {t('of')} <span className="font-semibold">{filteredMedia.length}</span> {t('files')}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  >
                    {t('Previous')}
                  </Button>

                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          className="w-10 h-8"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    {t('Next')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Modal */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {t('Upload Media Files')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className={`transition-all duration-200 ${
                  dragActive ? 'scale-110' : ''
                }`}>
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Upload className={`h-8 w-8 transition-colors ${
                      dragActive ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {dragActive ? t('Drop files here') : t('Upload your images')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t('Drag and drop your images here, or click to browse')}
                  </p>

                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload-modal"
                  />

                  <Button
                    type="button"
                    onClick={() => document.getElementById('file-upload-modal')?.click()}
                    disabled={uploading}
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ms-2"></div>
                        {t('Uploading...')}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 ms-2" />
                        {t('Choose Files')}
                      </>
                    )}
                  </Button>
                </div>

                {dragActive && (
                  <div className="absolute inset-0 bg-blue-500/10 rounded-xl" />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Modal */}
        <Dialog open={infoModalOpen} onOpenChange={setInfoModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t('Media Information')}
              </DialogTitle>
            </DialogHeader>

            {selectedMediaInfo && (
              <div className="space-y-6">
                {/* Image Preview */}
                <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                  <img
                    src={selectedMediaInfo.thumb_url}
                    alt={selectedMediaInfo.name}
                    className="max-w-full h-48 object-contain rounded-md shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = selectedMediaInfo.url;
                    }}
                  />
                </div>

                {/* File Details */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground">{t('File Name')}</span>
                      <span className="text-sm text-end max-w-xs truncate" title={selectedMediaInfo.file_name} dir="ltr">
                        {selectedMediaInfo.file_name}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">{t('File Type')}</span>
                      <Badge variant="secondary">{selectedMediaInfo.mime_type}</Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">{t('File Size')}</span>
                      <span className="text-sm" dir="ltr">{formatFileSize(selectedMediaInfo.size)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">{t('Uploaded')}</span>
                      <span className="text-sm">{formatDate(selectedMediaInfo.created_at)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <span className="text-sm font-medium text-muted-foreground block mb-2">{t('URL')}</span>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <code className="text-xs text-muted-foreground flex-1 truncate">
                        {selectedMediaInfo.url}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyLink(selectedMediaInfo.url)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleCopyLink(selectedMediaInfo.url)}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 ms-2" />
                    {t('Copy Link')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedMediaInfo.id, selectedMediaInfo.file_name)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 ms-2" />
                    {t('Download')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTemplate>
  );
}
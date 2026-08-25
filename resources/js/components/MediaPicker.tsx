import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useTranslation } from 'react-i18next';
import MediaLibraryModal from './MediaLibraryModal';
import { Image as ImageIcon, Images, X, UploadCloud, Loader2 } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { toast } from 'sonner';

interface MediaPickerProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  multiple?: boolean;
  placeholder?: string;
  dropzoneLabel?: string;
  hint?: string;
  showPreview?: boolean;
  required?: boolean;
  dragDrop?: boolean;
  inputId?: string;
}

export default function MediaPicker({
  label,
  value = '',
  onChange,
  multiple = false,
  placeholder = 'Select image...',
  dropzoneLabel,
  hint,
  showPreview = true,
  required = false,
  dragDrop = false,
  inputId,
}: MediaPickerProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSelect = (selectedUrl: string) => {
    onChange(convertToRelativePath(selectedUrl));
  };

  const convertToRelativePath = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('/storage')) {
      return url;
    }
    const storagePattern = /\/storage\/(.*)$/;
    const matches = url.match(storagePattern);
    if (matches && matches[0]) {
      return matches[0];
    }
    return url;
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      toast.warning(t('Please select an image file'));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      fileArray.forEach((file) => formData.append('files[]', file));
      const response = await fetch(route('api.media.batch'), {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
      });
      const result = await response.json();
      if (response.ok && result.data && result.data.length > 0) {
        const uploaded = result.data as { url: string }[];
        if (multiple) {
          const paths = uploaded.map((item) => convertToRelativePath(item.url));
          const current = typeof value === 'string' ? value : (value != null ? String(value) : '');
          onChange([...(current ? current.split(',').filter(Boolean) : []), ...paths].join(','));
        } else {
          onChange(convertToRelativePath(uploaded[0].url));
        }
        toast.success(result.message || t('Image uploaded successfully'));
      } else {
        toast.error(result.message || t('Upload failed'));
      }
    } catch {
      toast.error(t('Error uploading file'));
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const stringValue = Array.isArray(value) ? (value as unknown as string[]).join(',') : (typeof value === 'string' ? value : (value != null ? String(value) : ''));
  const imageUrls = stringValue ? stringValue.split(',').filter(Boolean) : [];

  return (
    <div className="space-y-2">
      {label && <Label required={required}>{label}</Label>}

      {dragDrop ? (
        <div
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files) {
              uploadFiles(e.dataTransfer.files);
            }
          }}
          className={`flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-all group ${
            multiple
              ? dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-purple-300 bg-purple-50/50'
              : dragActive ? 'border-emerald-500 bg-emerald-50/60' : 'border-gray-200 bg-gray-50/50 hover:border-emerald-500/50 hover:bg-emerald-50/30'
          }`}
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${multiple ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100/60 text-emerald-600'}`}>
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : multiple ? (
              <Images className="h-5 w-5" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${multiple ? 'bg-purple-100 text-purple-700' : 'bg-emerald-50 text-emerald-600'}`}>
            {multiple ? t('Multiple images') : (dropzoneLabel || t('Cover image (one file)'))}
          </span>
          <p className="text-sm text-muted-foreground">
            {uploading ? t('Uploading...') : t('Drag and drop an image here, or')}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => document.getElementById(`file-input-${inputId ?? label}`)?.click()}
            >
              <ImageIcon className="h-4 w-4 me-2" />
              {t('Browse files')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
            >
              <ImageIcon className="h-4 w-4 me-2" />
              {t('Media Library')}
            </Button>
          </div>
          {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
          <input
            id={`file-input-${inputId ?? label}`}
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                uploadFiles(e.target.files);
              }
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={multiple}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
          >
            <ImageIcon className="h-4 w-4 me-2" />
            {t('Select image')}
          </Button>
          {value && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Live Preview */}
      {showPreview && imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={getImageUrl(url)}
                alt={`${t('Preview')} ${index + 1}`}
                className={`${dragDrop ? 'w-24 h-24' : 'w-full h-20'} object-cover rounded-lg border shadow-sm`}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -top-2 -end-2 h-6 w-6 bg-background shadow"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <MediaLibraryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelect}
        multiple={multiple}
      />
    </div>
  );
}

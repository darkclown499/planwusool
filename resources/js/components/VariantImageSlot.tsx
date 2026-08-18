import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import MediaLibraryModal from '@/components/MediaLibraryModal';
import { getImageUrl } from '@/utils/image-helper';

interface VariantImageSlotProps {
  value?: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

const toRelative = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('/storage')) return url;
  const m = url.match(/\/storage\/(.*)$/);
  return m && m[0] ? m[0] : url;
};

/**
 * Small square image slot for a single variant combination. Opens the media
 * library; supports clearing the chosen image.
 */
export default function VariantImageSlot({ value = '', onChange }: VariantImageSlotProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-primary hover:text-primary"
      >
        {value ? (
          <img src={getImageUrl(value)} alt="" className="h-full w-full object-cover" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-gray-400 transition-colors hover:text-destructive"
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <MediaLibraryModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelect={(url) => {
          onChange(toRelative(url));
          setOpen(false);
        }}
      />
    </div>
  );
}
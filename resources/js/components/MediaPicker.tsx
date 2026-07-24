import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useTranslation } from 'react-i18next';
import MediaLibraryModal from './MediaLibraryModal';
import { Image as ImageIcon, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';

interface MediaPickerProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  multiple?: boolean;
  placeholder?: string;
  showPreview?: boolean;
  required?: boolean;
}

export default function MediaPicker({ 
  label, 
  value = '', 
  onChange, 
  multiple = false,
  placeholder = 'Select image...',
  showPreview = true,
  required = false
}: MediaPickerProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelect = (selectedUrl: string) => {
    // Convert absolute URL to relative path before storing
    const relativePath = convertToRelativePath(selectedUrl);
    onChange(relativePath);
  };
  
  // Function to convert absolute URL to relative path
  const convertToRelativePath = (url: string): string => {
    if (!url) return '';
    
    // If it's already a relative path starting with /storage, return as is
    if (url.startsWith('/storage')) {
      return url;
    }
    
    // Extract the path after /storage from the full URL
    const storagePattern = /\/storage\/(.*)$/;
    const matches = url.match(storagePattern);
    
    if (matches && matches[0]) {
      return matches[0]; // Return /storage/path/to/file.jpg
    }
    
    // If no match found, return the original URL
    return url;
  };
  
  // Function to convert relative path to full URL for display
  const getFullUrl = (path: string): string => {
    return getImageUrl(path);
  };

  const handleClear = () => {
    onChange('');
  };

  const imageUrls = value ? value.split(',').filter(Boolean) : [];

  return (
    <div className="space-y-2">
      {label && <Label required={required}>{label}</Label>}

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
          {t('اختيار صورة')}
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

      {/* Preview */}
      {showPreview && imageUrls.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={getFullUrl(url)}
                alt={`Preview ${index + 1}`}
                className="w-full h-20 object-cover rounded border"
              />
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
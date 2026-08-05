import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Simple renderers without importing components
export const columnRenderers = {
  // Status badge renderer
  status: (colorMap: Record<string, string> = {}, defaultColor = 'bg-gray-100 text-gray-800') => {
    return (value: any) => {
      if (!value) return <span>-</span>;
      const color = colorMap[value] || defaultColor;
      return (
        <Badge className={cn("capitalize", color)}>
          {value}
        </Badge>
      );
    };
  },
  
  // Image renderer
  image: (className = 'h-16 w-20 rounded-md object-cover shadow-sm', fallbackSrc = 'https://placehold.co/200x150?text=Image+Not+Found') => {
    return (_: any, row: any, key: any) => {
      if (!row[key]) return <div className="text-center text-gray-400">No image</div>;
      
      const imageSrc = typeof row[key] === 'string' && row[key].startsWith('http') 
        ? row[key] 
        : `/storage/${row[key]}`;
      
      return (
        <div className="flex justify-center">
          <img 
            src={imageSrc} 
            alt="Image" 
            className={className} 
            onError={(e) => {
              e.currentTarget.src = fallbackSrc;
            }}
          />
        </div>
      );
    };
  },
  
  // Price renderer
  price: (currency = 'USD', locale = 'en-US') => {
    return (value: any) => {
      if (value === null || value === undefined) return <span>-</span>;
      
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      return (
        <span className="text-sm font-medium">
          {numValue.toLocaleString(locale, { style: 'currency', currency })}
        </span>
      );
    };
  },
  
  // Date renderer
  date: (format: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }, locale = 'en-US') => {
    return (value: any) => {
      if (!value) return <span>-</span>;
      
      try {
        const date = new Date(value);
        return <span className="text-sm">{date.toLocaleDateString(locale, format)}</span>;
      } catch (e) {
        return <span className="text-sm">{value}</span>;
      }
    };
  },
  
  // Boolean renderer
  boolean: () => {
    return (value: any) => <span>{value ? 'Yes' : 'No'}</span>;
  },
  
  // Relation renderer
  relation: (field: any) => {
    return (_: any, row: any, key: any) => {
      const relation = row[key];
      return relation ? <span>{relation[field]}</span> : <span>-</span>;
    };
  }
};
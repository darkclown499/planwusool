import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import InputError from '@/components/input-error';

interface PaymentInputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  isSecret?: boolean;
  error?: string;
  className?: string;
}

export function PaymentInputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  isSecret = false,
  error,
  className = ''
}: PaymentInputFieldProps) {
  const [showSecret, setShowSecret] = useState(false);
  
  // Check both window.isDemo and page props for demo mode (like StorGo)
  const isDemoMode = (window as any).isDemo || (window as any).page?.props?.is_demo || false;
  
  // Show asterisks in demo mode for fields with values (both secret and non-secret credential fields)
  const displayValue = isDemoMode && value ? '************' : value;
  const inputType = isSecret ? (showSecret ? 'text' : 'password') : type;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={inputType}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`font-mono text-sm ${isSecret ? 'pr-10' : ''} ${className}`}
          readOnly={isDemoMode && value}
          aria-invalid={!!error}
        />
        {isSecret && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 text-muted-foreground"
            onClick={() => {
              if (isDemoMode) return false;
              setShowSecret(!showSecret);
            }}
            disabled={isDemoMode}
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
      </div>
      <InputError message={error} className="mt-1" />
    </div>
  );
}
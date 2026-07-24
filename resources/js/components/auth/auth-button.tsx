import { LoaderCircle } from 'lucide-react';
import { ButtonHTMLAttributes } from 'react';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    processing?: boolean;
    tabIndex?: number;
    children: React.ReactNode;
}

export default function AuthButton({
    processing = false,
    tabIndex,
    children,
    className = '',
    disabled,
    ...props
}: AuthButtonProps) {
    const { themeColor, customColor } = useBrand();
    const primaryColor = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS];
    return (
        <button
            {...props}
            type={props.type || 'submit'}
            className={`w-full text-white text-sm font-semibold py-3 rounded-xl shadow-lg shadow-gray-300/50 hover:shadow-xl hover:shadow-gray-300/60 active:scale-[0.98] transition-all duration-200 tracking-wide ${processing || disabled ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
            tabIndex={tabIndex}
            disabled={processing || disabled}
            style={{
                backgroundColor: primaryColor,
                boxShadow: `0 4px 14px ${primaryColor}40`,
            }}
        >
            {processing && <LoaderCircle className="h-4 w-4 animate-spin mr-2 inline" />}
            {children}
        </button>
    );
}

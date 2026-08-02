import React, { useState, ReactNode } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface AccordionSectionProps {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  defaultOpen?: boolean;
  onReset?: () => void;
  resetDisabled?: boolean;
  children: ReactNode;
  badge?: ReactNode;
}

export function AccordionSection({
  title,
  icon,
  subtitle,
  defaultOpen = false,
  onReset,
  resetDisabled = false,
  children,
  badge,
}: AccordionSectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
            <div className="min-w-0 text-start">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{title}</span>
                {badge}
              </div>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onReset && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={resetDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 me-1" />
                {t('Reset to Default')}
              </Button>
            )}
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border px-4 py-4">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default AccordionSection;

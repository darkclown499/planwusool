import React from 'react';
import { router } from '@inertiajs/react';
import { ExternalLink, ArrowRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DesignerNavigationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string | number | null;
}

export function DesignerNavigationModal({ open, onOpenChange, storeId }: DesignerNavigationModalProps) {
  if (!storeId) return null;

  const designerHref = `/stores/${storeId}/designer?tab=identity`;

  const handleNewTab = () => {
    window.open(designerHref, '_blank', 'noopener');
    onOpenChange(false);
  };

  const handleSameTab = () => {
    onOpenChange(false);
    router.visit(designerHref);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-lg font-black text-slate-900">الانتقال إلى مصمم المتجر</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 text-right">يرجى تحديد طريقة فتح مصمم المتجر:</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={handleNewTab} className="w-full gap-2 bg-emerald-600 font-bold hover:bg-emerald-700" size="lg">
            <ExternalLink className="h-4 w-4" />
            فتح في تبويب جديد
          </Button>

          <Button onClick={handleSameTab} variant="secondary" className="w-full gap-2 font-bold" size="lg">
            <ArrowRight className="h-4 w-4" />
            فتح في نفس الصفحة
          </Button>

          <Button onClick={handleCancel} variant="outline" className="w-full gap-2 font-bold" size="lg">
            <X className="h-4 w-4" />
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DesignerNavigationModal;

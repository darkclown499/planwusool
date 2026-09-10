// components/CrudDeleteModal.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface CrudDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName: string;
  entityName: string;
}

export function CrudDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  entityName
}: CrudDeleteModalProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = onConfirm();
      if (result instanceof Promise) {
        result.finally(() => setIsSubmitting(false)).catch(() => setIsSubmitting(false));
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Delete")} {entityName}</DialogTitle>
          <DialogDescription>
            {t("Are you sure you want to delete")} {itemName || `this ${entityName}`}? {t("This action cannot be undone.")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {t("Cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? t("Deleting...") : t("Delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

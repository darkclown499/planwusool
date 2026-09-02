// Canonical inventory movement types (must match app/Models/InventoryMovement.php).
export const MOVEMENT_TYPES: Record<string, { en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
    ONLINE_SALE: { en: 'Online Sale', variant: 'default' },
    POS_SALE: { en: 'POS Sale', variant: 'secondary' },
    ORDER_CANCEL_RESTOCK: { en: 'Cancel Restock', variant: 'success' },
    ORDER_RESTORE: { en: 'Order Restore', variant: 'secondary' },
    RETURN_RESTOCK: { en: 'Return Restock', variant: 'success' },
    MANUAL_ADJUSTMENT: { en: 'Manual Adjustment', variant: 'outline' },
    IMPORT_ADJUSTMENT: { en: 'Import Adjustment', variant: 'secondary' },
    ERP_ADJUSTMENT: { en: 'ERP Adjustment', variant: 'secondary' },
};
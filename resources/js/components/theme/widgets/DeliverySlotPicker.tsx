import { Clock } from 'lucide-react';
import React from 'react';

export interface DeliverySlot {
  label: string;
  value: string;
}

interface DeliverySlotPickerProps {
  slots: string[] | DeliverySlot[];
  value?: string;
  onChange: (slot: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Delivery-slot selector for the fresh-produce express checkout. Slots come from
 * the theme config (`commerce.deliverySlots`) and the selected slot is echoed
 * into the WhatsApp order message, so the seller knows exactly when to deliver.
 */
export const DeliverySlotPicker: React.FC<DeliverySlotPickerProps> = ({
  slots = [],
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  if (!slots || slots.length === 0) return null;

  const normalized: DeliverySlot[] = slots.map((slot) =>
    typeof slot === 'string' ? { label: slot, value: slot } : slot
  );

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        <Clock className="h-4 w-4" />
        <span>اختر وقت التوصيل</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {normalized.map((slot) => {
          const active = value === slot.value;
          return (
            <button
              key={slot.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(slot.value)}
              aria-pressed={active}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                active
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
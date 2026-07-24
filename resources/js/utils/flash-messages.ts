import { toast } from '@/components/custom-toast';
import { router } from '@inertiajs/react';

// Function to display flash messages as toasts
export function setupFlashMessages() {
  // Display initial flash messages
  const page = (window as any).page;
  if (page?.props?.flash) {
    if (page.props.flash.success) {
      toast.success(page.props.flash.success);
    }
    if (page.props.flash.error) {
      toast.error(page.props.flash.error);
    }
  }

  // Listen for navigation events to display new flash messages
  router.on('success', (event: any) => {
    const flash = event.detail.page.props.flash;
    if (flash?.success) {
      toast.success(flash.success);
    }
    if (flash?.error) {
      toast.error(flash.error);
    }
  });

  // Listen for validation errors
  router.on('error', (event: any) => {
    const errors = event.detail.errors;
    if (errors && Object.keys(errors).length > 0) {
      // Show the first error as a toast
      const firstErrorKey = Object.keys(errors)[0];
      toast.error(errors[firstErrorKey]);
    }
  });
}
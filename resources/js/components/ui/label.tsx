import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, htmlFor, required, children, ...props }, ref) => {
  const [isRequired, setIsRequired] = React.useState(required || false);

  React.useEffect(() => {
    if (required !== undefined) {
      setIsRequired(required);
    } else if (htmlFor) {
      const element = document.getElementById(htmlFor);
      setIsRequired(element?.hasAttribute('required') || false);

      // Auto-update if it changes dynamically
      if (element) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === 'required') {
              setIsRequired(element.hasAttribute('required'));
            }
          });
        });
        observer.observe(element, { attributes: true });
        return () => observer.disconnect();
      }
    }
  }, [htmlFor, required]);

  return (
    <LabelPrimitive.Root
      ref={ref}
      data-slot="label"
      className={cn(
        "text-sm leading-none font-medium text-gray-600 dark:text-gray-300 select-none text-right block w-full group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      htmlFor={htmlFor}
      {...props}
    >
      {children}
      {isRequired && <span className="text-red-500 font-bold ms-1">*</span>}
    </LabelPrimitive.Root>
  )
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label }

'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <div className="relative flex items-center">
    <input
      type="checkbox"
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-brand ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-brand data-[state=checked]:text-white appearance-none cursor-pointer checked:bg-brand checked:border-brand",
        className
      )}
      ref={ref}
      {...props}
    />
    <Check className="absolute left-0 top-0 h-4 w-4 text-white pointer-events-none hidden peer-checked:block" />
  </div>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };

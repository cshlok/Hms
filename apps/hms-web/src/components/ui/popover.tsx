import React from 'react';
import { cn } from '@/lib/utils';

interface PopoverProps extends React.HTMLAttributes<HTMLDivElement> {}

const Popover = ({ className, ...props }: PopoverProps) => (
  <div className={cn("relative", className)} {...props} />
);
Popover.displayName = "Popover";

interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    />
  )
);
PopoverTrigger.displayName = "PopoverTrigger";

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 w-72 rounded-md border border-gray-200 bg-white p-4 shadow-md outline-none",
        className
      )}
      {...props}
    />
  )
);
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };

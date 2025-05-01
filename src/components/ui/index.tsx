import React from 'react';

// UI components barrel file
// This file exports all UI components to make imports cleaner

// Define more specific props types using React's utility types

// Button component Props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = ({ children, variant = 'default', size = 'md', className = '', ...props }: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const variantStyles: { [key: string]: string } = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-400',
    ghost: 'bg-transparent hover:bg-gray-100 focus-visible:ring-gray-400',
    success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
  };

  const sizeStyles: { [key: string]: string } = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-6 py-3 text-lg',
    icon: 'h-10 w-10',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant || 'default']} ${sizeStyles[size || 'md']} ${className}`;

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};
Button.displayName = "Button";

// Card components Props
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const Card = ({ children, className = '', ...props }: CardProps) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
};
Card.displayName = "Card";

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardHeader = ({ children, className = '', ...props }: CardHeaderProps) => {
  return (
    <div className={`p-6 pb-3 ${className}`} {...props}>
      {children}
    </div>
  );
};
CardHeader.displayName = "CardHeader";

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export const CardTitle = ({ children, className = '', ...props }: CardTitleProps) => {
  return (
    <h3 className={`text-lg font-semibold ${className}`} {...props}>
      {children}
    </h3>
  );
};
CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export const CardDescription = ({ children, className = '', ...props }: CardDescriptionProps) => {
  return (
    <p className={`text-sm text-gray-500 ${className}`} {...props}>
      {children}
    </p>
  );
};
CardDescription.displayName = "CardDescription";

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardContent = ({ children, className = '', ...props }: CardContentProps) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};
CardContent.displayName = "CardContent";

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardFooter = ({ children, className = '', ...props }: CardFooterProps) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};
CardFooter.displayName = "CardFooter";

// Input component
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
});
Input.displayName = "Input";

// Label component
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <label ref={ref} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>
      {children}
    </label>
  );
});
Label.displayName = "Label";

// Textarea component
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = '', ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={`flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

// Badge component Props
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

export const Badge = ({ children, variant = 'default', className = '', ...props }: BadgeProps) => {
  const variantStyles: { [key: string]: string } = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    destructive: 'bg-red-100 text-red-800',
    outline: 'text-gray-800 border border-gray-200 bg-transparent',
    success: 'bg-green-100 text-green-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant || 'default']} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
Badge.displayName = "Badge";

// Alert components Props
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
}

export const Alert = ({ children, variant = 'default', className = '', ...props }: AlertProps) => {
  const variantStyles: { [key: string]: string } = {
    default: 'bg-blue-50 text-blue-800 border-blue-200',
    destructive: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    success: 'bg-green-50 text-green-800 border-green-200',
  };

  return (
    <div
      className={`p-4 rounded-md border ${variantStyles[variant || 'default']} ${className}`}
      role="alert"
      {...props}
    >
      {children}
    </div>
  );
};
Alert.displayName = "Alert";

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const AlertDescription = ({ children, className = '', ...props }: AlertDescriptionProps) => {
  return (
    <div className={`text-sm ${className}`} {...props}>
      {children}
    </div>
  );
};
AlertDescription.displayName = "AlertDescription";

// Table components
export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <div className="w-full overflow-auto">
      <table ref={ref} className={`w-full caption-bottom text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
});
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <thead ref={ref} className={`${className}`} {...props}>
      {children}
    </thead>
  );
});
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <tbody ref={ref} className={`${className}`} {...props}>
      {children}
    </tbody>
  );
});
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <tr ref={ref} className={`border-b border-gray-200 transition-colors hover:bg-gray-50 ${className}`} {...props}>
      {children}
    </tr>
  );
});
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <th ref={ref} className={`h-12 px-4 text-left align-middle font-medium text-gray-500 ${className}`} {...props}>
      {children}
    </th>
  );
});
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <td ref={ref} className={`p-4 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
});
TableCell.displayName = "TableCell";

// Define specific props type for Tabs component
interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

// Tabs components
export const Tabs = ({ children, value, onValueChange, className = '', ...props }: TabsProps) => {
  return (
    <div className={`${className}`} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // Pass value and onValueChange explicitly, add type assertion for child props
          return React.cloneElement(child as React.ReactElement<{ value?: string, onValueChange?: (value: string) => void, parentValue?: string }>, {
            value: child.type === TabsContent ? value : undefined, // Pass value only to TabsContent
            onValueChange: child.type === TabsTrigger ? onValueChange : undefined, // Pass onValueChange only to TabsTrigger
            parentValue: value, // Pass parent value to children for comparison
          });
        }
        return child;
      })}
    </div>
  );
};
Tabs.displayName = "Tabs";

// Define specific props type for TabsList component
interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const TabsList = ({ children, className = '', ...props }: TabsListProps) => {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`} role="tablist" {...props}>
      {children}
    </div>
  );
};
TabsList.displayName = "TabsList";

// Define specific props type for TabsTrigger component
interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  value: string;
  className?: string;
  onValueChange?: (value: string) => void; // Received from Tabs
  parentValue?: string; // Received from Tabs
}

export const TabsTrigger = ({ children, value, className = '', onValueChange, parentValue, ...props }: TabsTriggerProps) => {
  const isActive = parentValue === value;

  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? 'bg-white text-blue-700 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      } ${className}`}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  );
};
TabsTrigger.displayName = "TabsTrigger";

// Define specific props type for TabsContent component
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  value: string;
  className?: string;
  parentValue?: string; // Received from Tabs
}

export const TabsContent = ({ children, value, className = '', parentValue, ...props }: TabsContentProps) => {
  const isActive = parentValue === value;

  if (!isActive) return null;

  return (
    <div
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
      role="tabpanel"
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
};
TabsContent.displayName = "TabsContent";

// Define specific props type for Dialog component
interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  open?: boolean; // Add open state if controlled externally
  onOpenChange?: (open: boolean) => void; // Add handler for external control
}

// Dialog components
export const Dialog = ({ children, open: controlledOpen, onOpenChange, ...props }: DialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  return (
    <div {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // Pass open and setOpen explicitly, add type assertion for child props
          return React.cloneElement(child as React.ReactElement<{ open?: boolean, setOpen?: React.Dispatch<React.SetStateAction<boolean>> }>, {
            open,
            setOpen: setOpen as React.Dispatch<React.SetStateAction<boolean>>, // Cast for internal state setter compatibility
          });
        }
        return child;
      })}
    </div>
  );
};
Dialog.displayName = "Dialog";

// Define specific props type for DialogTrigger component
interface DialogTriggerProps extends React.ComponentPropsWithoutRef<'button'> {
  children: React.ReactNode;
  asChild?: boolean;
  open?: boolean; // Received from Dialog
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Dialog
}

export const DialogTrigger = ({ children, asChild, setOpen, ...props }: DialogTriggerProps) => {
  const handleClick = () => {
    setOpen?.(true);
  };

  if (asChild && React.isValidElement(children)) {
    const childOnClick = children.props && typeof children.props.onClick === 'function' ? children.props.onClick : undefined;
    // Use React.ReactElement<React.HTMLAttributes<HTMLElement>> for better type safety
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      ...props,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        childOnClick?.(e);
        handleClick();
      },
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
};
DialogTrigger.displayName = "DialogTrigger";

// Define specific props type for DialogContent component
interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  open?: boolean; // Received from Dialog
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Dialog
  className?: string;
}

export const DialogContent = ({ children, open, setOpen, className = '', ...props }: DialogContentProps) => {
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen?.(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={() => setOpen?.(false)}>
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-lg bg-white p-6 shadow-lg ${className}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside content
        {...props}
      >
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          onClick={() => setOpen?.(false)}
        >
          <span className="sr-only">Close</span>
          {/* Simple X SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
};
DialogContent.displayName = "DialogContent";

// Define specific props type for DialogHeader component
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const DialogHeader = ({ children, className = '', ...props }: DialogHeaderProps) => {
  return (
    <div className={`text-center sm:text-left ${className}`} {...props}>
      {children}
    </div>
  );
};
DialogHeader.displayName = "DialogHeader";

// Define specific props type for DialogTitle component
interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export const DialogTitle = ({ children, className = '', ...props }: DialogTitleProps) => {
  return (
    <h2 className={`text-lg font-semibold leading-6 text-gray-900 ${className}`} {...props}>
      {children}
    </h2>
  );
};
DialogTitle.displayName = "DialogTitle";

// Define specific props type for DialogFooter component
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const DialogFooter = ({ children, className = '', ...props }: DialogFooterProps) => {
  return (
    <div className={`mt-5 sm:mt-4 sm:flex sm:flex-row-reverse ${className}`} {...props}>
      {children}
    </div>
  );
};
DialogFooter.displayName = "DialogFooter";

// Define specific props type for DialogClose component
interface DialogCloseProps extends React.ComponentPropsWithoutRef<'button'> {
  children: React.ReactNode;
  asChild?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Dialog
}

export const DialogClose = ({ children, asChild, setOpen, ...props }: DialogCloseProps) => {
  const handleClick = () => {
    setOpen?.(false);
  };

  if (asChild && React.isValidElement(children)) {
    const childOnClick = children.props && typeof children.props.onClick === 'function' ? children.props.onClick : undefined;
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      ...props,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        childOnClick?.(e);
        handleClick();
      },
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
};
DialogClose.displayName = "DialogClose";

// Calendar component (Simplified example, assuming react-day-picker is used)
// Needs react-day-picker installed: npm install react-day-picker
import { DayPicker, DayPickerProps } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface CalendarProps extends DayPickerProps {
  className?: string;
  classNames?: DayPickerProps['classNames'];
  showOutsideDays?: boolean;
  // onDaySelect is part of DayPickerProps, no need to redefine unless overriding
}

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={`p-3 ${className}`}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-gray-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
        day_selected: 'bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white',
        day_today: 'bg-gray-100 text-gray-900',
        day_outside: 'text-gray-500 opacity-50',
        day_disabled: 'text-gray-500 opacity-50',
        day_range_middle: 'aria-selected:bg-gray-100 aria-selected:text-gray-900',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        // IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        // IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        // Use simple arrows if icons are problematic
        IconLeft: () => <span className="h-4 w-4">{'<'}</span>,
        IconRight: () => <span className="h-4 w-4">{'>'}</span>,
      }}
      {...props} // Pass rest of the props including onSelect, selected, etc.
    />
  );
}
Calendar.displayName = "Calendar";

// Skeleton component
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      {...props}
    />
  );
}
Skeleton.displayName = "Skeleton";

// Select components (Simplified stubs, assuming Radix or similar)
// Needs proper implementation or library integration

export const Select = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
Select.displayName = "Select";
export const SelectTrigger = ({ children }: { children: React.ReactNode }) => <button>{children}</button>;
SelectTrigger.displayName = "SelectTrigger";
export const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder || 'Select...'}</span>;
SelectValue.displayName = "SelectValue";
export const SelectContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
SelectContent.displayName = "SelectContent";
export const SelectItem = ({ children, value }: { children: React.ReactNode, value: string }) => <div data-value={value}>{children}</div>;
SelectItem.displayName = "SelectItem";

// Export other components if they exist
export * from './use-toast';
export * from './toast';


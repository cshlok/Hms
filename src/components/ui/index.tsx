import React from 'react'; // FIX: Add React import

// UI components barrel file
// This file exports all UI components to make imports cleaner

// Button component
export const Button = ({ children, variant = 'default', size = 'md', className = '', ...props }: { children?: React.ReactNode, variant?: string, size?: string, className?: string, [key: string]: any }) => {
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
// FIX: Add display name
Button.displayName = "Button";

// Card components
export const Card = ({ children, className = '', ...props }: { children?: React.ReactNode, className?: string, [key: string]: any }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
};
// FIX: Add display name
Card.displayName = "Card";

export const CardHeader = ({ children, className = '', ...props }: { children?: React.ReactNode, className?: string, [key: string]: any }) => {
  return (
    <div className={`p-6 pb-3 ${className}`} {...props}>
      {children}
    </div>
  );
};
// FIX: Add display name
CardHeader.displayName = "CardHeader";

export const CardTitle = ({ children, className = '', ...props }: { children?: React.ReactNode, className?: string, [key: string]: any }) => {
  return (
    <h3 className={`text-lg font-semibold ${className}`} {...props}>
      {children}
    </h3>
  );
};
// FIX: Add display name
CardTitle.displayName = "CardTitle";

export const CardDescription = ({ children, className = '', ...props }: { children?: React.ReactNode, className?: string, [key: string]: any }) => {
  return (
    <p className={`text-sm text-gray-500 ${className}`} {...props}>
      {children}
    </p>
  );
};
// FIX: Add display name
CardDescription.displayName = "CardDescription";

export const CardContent = ({ children, className = '', ...props }: { children?: React.ReactNode, className?: string, [key: string]: any }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};
// FIX: Add display name
CardContent.displayName = "CardContent";

export const CardFooter = ({ children, className = '', ...props }: { children?: React.ReactNode, className?: string, [key: string]: any }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};
// FIX: Add display name
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
// FIX: Add display name
Input.displayName = "Input";

// Label component
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <label ref={ref} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>
      {children}
    </label>
  );
});
// FIX: Add display name
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
// FIX: Add display name
Textarea.displayName = "Textarea";

// Badge component
export const Badge = ({ children, variant = 'default', className = '', ...props }: { children?: React.ReactNode, variant?: string, className?: string, [key: string]: any }) => {
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
// FIX: Add display name
Badge.displayName = "Badge";

// Alert components
export const Alert = ({ children, variant = 'default', className = '', ...props }: { children?: React.ReactNode, variant?: string, className?: string, [key: string]: any }) => {
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
// FIX: Add display name
Alert.displayName = "Alert";

export const AlertDescription = ({ children, className = '', ...props }: { children?: React.ReactNode, className?: string, [key: string]: any }) => {
  return (
    <div className={`text-sm ${className}`} {...props}>
      {children}
    </div>
  );
};
// FIX: Add display name
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
// FIX: Add display name
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <thead ref={ref} className={`${className}`} {...props}>
      {children}
    </thead>
  );
});
// FIX: Add display name
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <tbody ref={ref} className={`${className}`} {...props}>
      {children}
    </tbody>
  );
});
// FIX: Add display name
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <tr ref={ref} className={`border-b border-gray-200 transition-colors hover:bg-gray-50 ${className}`} {...props}>
      {children}
    </tr>
  );
});
// FIX: Add display name
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <th ref={ref} className={`h-12 px-4 text-left align-middle font-medium text-gray-500 ${className}`} {...props}>
      {children}
    </th>
  );
});
// FIX: Add display name
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ children, className = '', ...props }, ref) => {
  return (
    <td ref={ref} className={`p-4 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
});
// FIX: Add display name
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
          // FIX: Pass value and onValueChange explicitly, add type assertion for child props
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
// FIX: Add display name
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
// FIX: Add display name
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
// FIX: Add display name
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
// FIX: Add display name
TabsContent.displayName = "TabsContent";

// Define specific props type for Dialog component
interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

// Dialog components
export const Dialog = ({ children, ...props }: DialogProps) => {
  const [open, setOpen] = React.useState(false);
  
  return (
    <div {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // FIX: Pass open and setOpen explicitly, add type assertion for child props
          return React.cloneElement(child as React.ReactElement<{ open?: boolean, setOpen?: React.Dispatch<React.SetStateAction<boolean>> }>, {
            open,
            setOpen,
          });
        }
        return child;
      })}
    </div>
  );
};
// FIX: Add display name
Dialog.displayName = "Dialog";

// Define specific props type for DialogTrigger component
// FIX: Use React.ComponentPropsWithoutRef<'button'> to inherit button props correctly
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
    // FIX: Ensure children.props exists before accessing onClick
    const childOnClick = children.props && typeof children.props.onClick === 'function' ? children.props.onClick : undefined;
    // FIX: Use React.cloneElement with proper type assertion for the child element's props
    return React.cloneElement(children as React.ReactElement<any>, {
      ...props,
      onClick: (e: React.MouseEvent) => {
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
// FIX: Add display name
DialogTrigger.displayName = "DialogTrigger";

// Define specific props type for DialogContent component
interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  open?: boolean; // Received from Dialog
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Dialog
  className?: string;
}

export const DialogContent = ({ children, open, setOpen, className = '', ...props }: DialogContentProps) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-lg bg-white p-6 shadow-lg ${className}`}
        {...props}
      >
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          onClick={() => setOpen?.(false)}
        >
          <span className="sr-only">Close</span>
          {/* Replace SVG with a simple X for now if lucide-react is not installed or causing issues */}
          {/* <X className="h-4 w-4" /> */}
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
           </svg>
        </button>
        {children}
      </div>
    </div>
  );
};
// FIX: Add display name
DialogContent.displayName = "DialogContent";

// Define specific props type for DialogHeader component
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const DialogHeader = ({ children, className = '', ...props }: DialogHeaderProps) => {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
};
// FIX: Add display name
DialogHeader.displayName = "DialogHeader";

// Define specific props type for DialogTitle component
interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle = ({ children, className = '', ...props }: DialogTitleProps) => {
  return (
    <h2 className={`text-lg font-semibold ${className}`} {...props}>
      {children}
    </h2>
  );
};
// FIX: Add display name
DialogTitle.displayName = "DialogTitle";

// Define specific props type for Select component
interface SelectProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
  value?: string;
}

// Select components
export const Select = ({ children, onValueChange, value, ...props }: SelectProps) => {
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState<string>(value || '');
  
  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]); // FIX: Remove setSelectedValue from dependency array as it's stable
  
  return (
    <div {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // FIX: Pass props explicitly, add type assertion for child props
          return React.cloneElement(child as React.ReactElement<{ open?: boolean, setOpen?: React.Dispatch<React.SetStateAction<boolean>>, selectedValue?: string, setSelectedValue?: React.Dispatch<React.SetStateAction<string>>, onValueChange?: (value: string) => void }>, {
            open,
            setOpen,
            selectedValue,
            setSelectedValue,
            onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
};
// FIX: Add display name
Select.displayName = "Select";

// Define specific props type for SelectTrigger component
interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  open?: boolean; // Received from Select
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Select
  selectedValue?: string; // Received from Select
  placeholder?: string;
}

export const SelectTrigger = ({ children, className = '', open, setOpen, selectedValue, placeholder, ...props }: SelectTriggerProps) => {
  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setOpen?.(!open)}
      {...props}
    >
      {/* FIX: Render selected value's corresponding child or placeholder */} 
      {selectedValue
        ? React.Children.toArray(children).find(child => React.isValidElement(child) && child.props.value === selectedValue)
        : <span className="text-gray-400">{placeholder}</span>}
      {/* Replace SVG with a simple arrow for now if lucide-react is not installed */}
      {/* <ChevronDown className="h-4 w-4 opacity-50" /> */}
       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
       </svg>
    </button>
  );
};
// FIX: Add display name
SelectTrigger.displayName = "SelectTrigger";

// Define specific props type for SelectValue component
interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
  children?: React.ReactNode; // Usually not used directly, value comes from Select
  selectedValue?: string; // Received from Select
}

export const SelectValue = ({ placeholder, selectedValue, ...props }: SelectValueProps) => {
  // FIX: Render selected value or placeholder - This component might be redundant if Trigger handles display
  return <span {...props}>{selectedValue || placeholder}</span>;
};
// FIX: Add display name
SelectValue.displayName = "SelectValue";

// Define specific props type for SelectContent component
interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  open?: boolean; // Received from Select
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Select
  className?: string;
}

export const SelectContent = ({ children, open, setOpen, className = '', ...props }: SelectContentProps) => {
  if (!open) return null;
  
  return (
    <div className="relative z-50">
      <div className="fixed inset-0" onClick={() => setOpen?.(false)} />
      <div
        className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900 shadow-md animate-in fade-in-80 ${className}`}
        {...props}
      >
        {/* FIX: Ensure Radix variable exists or remove max-h style */}
        {/* <div className="max-h-[var(--radix-select-content-available-height)] overflow-auto"> */}
        <div className="max-h-[200px] overflow-auto"> {/* Example fixed height */} 
          {children}
        </div>
      </div>
    </div>
  );
};
// FIX: Add display name
SelectContent.displayName = "SelectContent";

// Define specific props type for SelectItem component
interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  value: string;
  className?: string;
  selectedValue?: string; // Received from Select
  setSelectedValue?: React.Dispatch<React.SetStateAction<string>>; // Received from Select
  onValueChange?: (value: string) => void; // Received from Select
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Select
}

export const SelectItem = ({ children, value, className = '', selectedValue, setSelectedValue, onValueChange, setOpen, ...props }: SelectItemProps) => {
  const isSelected = selectedValue === value;
  
  const handleClick = () => {
    setSelectedValue?.(value);
    onValueChange?.(value);
    setOpen?.(false);
  };
  
  return (
    <div
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${
        isSelected ? 'bg-gray-100' : ''
      } ${className}`}
      onClick={handleClick}
      aria-selected={isSelected}
      role="option"
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && (
          /* Replace SVG with a simple checkmark for now if lucide-react is not installed */
          /* <Check className="h-4 w-4" /> */
           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
           </svg>
        )}
      </span>
      <span className="truncate">{children}</span>
    </div>
  );
};
// FIX: Add display name
SelectItem.displayName = "SelectItem";

// Define specific props type for Calendar component
// FIX: Omit conflicting 'onSelect' from HTMLAttributes
interface CalendarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  // Assuming props similar to react-day-picker for example
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | Date[] | { from?: Date; to?: Date };
  onSelect?: (day: Date | undefined) => void; // Custom onSelect for day picking
  className?: string;
  // Add other props from the actual calendar library being used
}

// Calendar component (simplified placeholder)
// FIX: Destructure props correctly, handle custom onSelect prop
export const Calendar = ({ className = '', onSelect: onDaySelect, ...props }: CalendarProps) => {
  // Use onDaySelect for the custom logic, props contains standard div attributes
  // Example usage (needs actual calendar logic):
  // const handleDayClick = (day: Date) => { onDaySelect?.(day); };

  return (
    <div className={`p-3 ${className}`} {...props}>
      <div className="grid grid-cols-7 gap-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
        {/* Calendar days would be generated here based on a library like react-day-picker */}
        {Array.from({ length: 35 }).map((_, i) => <div key={i} className="h-8 w-8"></div>)} {/* Placeholder days */}
      </div>
    </div>
  );
};
// FIX: Add display name
Calendar.displayName = "Calendar";

// Export block - remove as all components are exported individually
// export {
// };


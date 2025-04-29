// UI components barrel file
// This file exports all UI components to make imports cleaner

// Button component
export const Button = ({ children, variant = 'default', size = 'md', className = '', ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variantStyles = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-400',
    ghost: 'bg-transparent hover:bg-gray-100 focus-visible:ring-gray-400',
    success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
  };
  
  const sizeStyles = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-6 py-3 text-lg',
    icon: 'h-10 w-10',
  };
  
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
  
  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};

// Card components
export const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-6 pb-3 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '', ...props }) => {
  return (
    <h3 className={`text-lg font-semibold ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription = ({ children, className = '', ...props }) => {
  return (
    <p className={`text-sm text-gray-500 ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

// Input component
export const Input = ({ className = '', ...props }) => {
  return (
    <input
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

// Label component
export const Label = ({ children, className = '', ...props }) => {
  return (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>
      {children}
    </label>
  );
};

// Textarea component
export const Textarea = ({ className = '', ...props }) => {
  return (
    <textarea
      className={`flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

// Badge component
export const Badge = ({ children, variant = 'default', className = '', ...props }) => {
  const variantStyles = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    destructive: 'bg-red-100 text-red-800',
    outline: 'text-gray-800 border border-gray-200 bg-transparent',
    success: 'bg-green-100 text-green-800',
  };
  
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// Alert components
export const Alert = ({ children, variant = 'default', className = '', ...props }) => {
  const variantStyles = {
    default: 'bg-blue-50 text-blue-800 border-blue-200',
    destructive: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    success: 'bg-green-50 text-green-800 border-green-200',
  };
  
  return (
    <div
      className={`p-4 rounded-md border ${variantStyles[variant]} ${className}`}
      role="alert"
      {...props}
    >
      {children}
    </div>
  );
};

export const AlertDescription = ({ children, className = '', ...props }) => {
  return (
    <div className={`text-sm ${className}`} {...props}>
      {children}
    </div>
  );
};

// Table components
export const Table = ({ children, className = '', ...props }) => {
  return (
    <div className="w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader = ({ children, className = '', ...props }) => {
  return (
    <thead className={`${className}`} {...props}>
      {children}
    </thead>
  );
};

export const TableBody = ({ children, className = '', ...props }) => {
  return (
    <tbody className={`${className}`} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow = ({ children, className = '', ...props }) => {
  return (
    <tr className={`border-b border-gray-200 transition-colors hover:bg-gray-50 ${className}`} {...props}>
      {children}
    </tr>
  );
};

export const TableHead = ({ children, className = '', ...props }) => {
  return (
    <th className={`h-12 px-4 text-left align-middle font-medium text-gray-500 ${className}`} {...props}>
      {children}
    </th>
  );
};

export const TableCell = ({ children, className = '', ...props }) => {
  return (
    <td className={`p-4 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
};

// Tabs components
export const Tabs = ({ children, value, onValueChange, className = '', ...props }) => {
  return (
    <div className={`${className}`} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            value,
            onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
};

export const TabsList = ({ children, className = '', ...props }) => {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`} role="tablist" {...props}>
      {children}
    </div>
  );
};

export const TabsTrigger = ({ children, value, className = '', ...props }) => {
  const isActive = props.value === value;
  
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
      onClick={() => props.onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ children, value, className = '', ...props }) => {
  const isActive = props.value === value;
  
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

// Dialog components
export const Dialog = ({ children, ...props }) => {
  const [open, setOpen] = React.useState(false);
  
  return (
    <div {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            open,
            setOpen,
          });
        }
        return child;
      })}
    </div>
  );
};

export const DialogTrigger = ({ children, asChild, open, setOpen, ...props }) => {
  const handleClick = () => {
    setOpen(true);
  };
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e) => {
        children.props.onClick?.(e);
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

export const DialogContent = ({ children, open, setOpen, className = '', ...props }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        className={`w-full max-w-md overflow-hidden rounded-lg bg-white p-6 shadow-lg ${className}`}
        {...props}
      >
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          onClick={() => setOpen(false)}
        >
          <span className="sr-only">Close</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
};

export const DialogHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const DialogTitle = ({ children, className = '', ...props }) => {
  return (
    <h2 className={`text-lg font-semibold ${className}`} {...props}>
      {children}
    </h2>
  );
};

// Select components
export const Select = ({ children, onValueChange, value, ...props }) => {
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(value || '');
  
  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);
  
  return (
    <div {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
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

export const SelectTrigger = ({ children, className = '', open, setOpen, selectedValue, ...props }) => {
  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
    </button>
  );
};

export const SelectValue = ({ placeholder, children, selectedValue, ...props }) => {
  return <span {...props}>{selectedValue || placeholder}</span>;
};

export const SelectContent = ({ children, open, setOpen, className = '', ...props }) => {
  if (!open) return null;
  
  return (
    <div className="relative z-50">
      <div className="fixed inset-0" onClick={() => setOpen(false)} />
      <div
        className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900 shadow-md animate-in fade-in-80 ${className}`}
        {...props}
      >
        <div className="max-h-[var(--radix-select-content-available-height)] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export const SelectItem = ({ children, value, className = '', selectedValue, setSelectedValue, onValueChange, setOpen, ...props }) => {
  const isSelected = selectedValue === value;
  
  const handleClick = () => {
    setSelectedValue(value);
    onValueChange?.(value);
    setOpen(false);
  };
  
  return (
    <div
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 ${
        isSelected ? 'bg-gray-100' : ''
      } ${className}`}
      onClick={handleClick}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className="truncate">{children}</span>
    </div>
  );
};

// Calendar component (simplified)
export const Calendar = ({ mode, selected, onSelect, className = '', ...props }) => {
  return (
    <div className={`p-3 ${className}`} {...props}>
      <div className="grid grid-cols-7 gap-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
        {/* Calendar days would be generated here */}
      </div>
    </div>
  );
};

// Export block - only include components NOT defined with 'export const' above
export {
  // Button, // Already exported above
  // Card, // Already exported above
  // CardHeader, // Already exported above
  // CardTitle, // Already exported above
  // CardDescription, // Already exported above
  // CardContent, // Already exported above
  // CardFooter, // Already exported above
  // Input, // Already exported above
  // Label, // Already exported above
  // Textarea, // Already exported above
  // Badge, // Already exported above
  // Alert, // Already exported above
  // AlertDescription, // Already exported above
  // Table, // Already exported above
  // TableHeader, // Already exported above
  // TableBody, // Already exported above
  // TableRow, // Already exported above
  // TableHead, // Already exported above
  // TableCell, // Already exported above
  // Tabs, // Already exported above
  // TabsList, // Already exported above
  // TabsTrigger, // Already exported above
  // TabsContent, // Already exported above
  // Dialog, // Already exported above
  // DialogTrigger, // Already exported above
  // DialogContent, // Already exported above
  // DialogHeader, // Already exported above
  // DialogTitle, // Already exported above
  // Select, // Already exported above
  // SelectTrigger, // Already exported above
  // SelectValue, // Already exported above
  // SelectContent, // Already exported above
  // SelectItem, // Already exported above
  // Calendar // Already exported above
};


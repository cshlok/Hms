import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react"; // Added import for icons

// UI components barrel file
// This file exports all UI components to make imports cleaner

// Define more specific props types using React's utility types

// Button component Props
interface ButtonProperties
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "ghost" | "success";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = ({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...properties
}: ButtonProperties) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variantStyles: { [key: string]: string } = {
    default:
      "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    outline:
      "border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-400",
    ghost: "bg-transparent hover:bg-gray-100 focus-visible:ring-gray-400",
    success:
      "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500",
  };

  const sizeStyles: { [key: string]: string } = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2",
    lg: "h-12 px-6 py-3 text-lg",
    icon: "h-10 w-10",
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant || "default"]} ${sizeStyles[size || "md"]} ${className}`;

  return (
    <button className={combinedClassName} {...properties}>
      {children}
    </button>
  );
};
Button.displayName = "Button";

// Card components Props
interface CardProperties extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const Card = ({
  children,
  className = "",
  ...properties
}: CardProperties) => {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}
      {...properties}
    >
      {children}
    </div>
  );
};
Card.displayName = "Card";

interface CardHeaderProperties extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardHeader = ({
  children,
  className = "",
  ...properties
}: CardHeaderProperties) => {
  return (
    <div className={`p-6 pb-3 ${className}`} {...properties}>
      {children}
    </div>
  );
};
CardHeader.displayName = "CardHeader";

interface CardTitleProperties extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export const CardTitle = ({
  children,
  className = "",
  ...properties
}: CardTitleProperties) => {
  return (
    <h3 className={`text-lg font-semibold ${className}`} {...properties}>
      {children}
    </h3>
  );
};
CardTitle.displayName = "CardTitle";

interface CardDescriptionProperties
  extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export const CardDescription = ({
  children,
  className = "",
  ...properties
}: CardDescriptionProperties) => {
  return (
    <p className={`text-sm text-gray-500 ${className}`} {...properties}>
      {children}
    </p>
  );
};
CardDescription.displayName = "CardDescription";

interface CardContentProperties extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardContent = ({
  children,
  className = "",
  ...properties
}: CardContentProperties) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...properties}>
      {children}
    </div>
  );
};
CardContent.displayName = "CardContent";

interface CardFooterProperties extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardFooter = ({
  children,
  className = "",
  ...properties
}: CardFooterProperties) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...properties}>
      {children}
    </div>
  );
};
CardFooter.displayName = "CardFooter";

// Input component
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...properties }, reference) => {
  return (
    <input
      ref={reference}
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...properties}
    />
  );
});
Input.displayName = "Input";

// Label component
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ children, className = "", ...properties }, reference) => {
  return (
    <label
      ref={reference}
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...properties}
    >
      {children}
    </label>
  );
});
Label.displayName = "Label";

// Textarea component
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...properties }, reference) => {
  return (
    <textarea
      ref={reference}
      className={`flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...properties}
    />
  );
});
Textarea.displayName = "Textarea";

// Badge component Props
interface BadgeProperties extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

export const Badge = ({
  children,
  variant = "default",
  className = "",
  ...properties
}: BadgeProperties) => {
  const variantStyles: { [key: string]: string } = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-800",
    destructive: "bg-red-100 text-red-800",
    outline: "text-gray-800 border border-gray-200 bg-transparent",
    success: "bg-green-100 text-green-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant || "default"]} ${className}`}
      {...properties}
    >
      {children}
    </span>
  );
};
Badge.displayName = "Badge";

// Alert components Props
interface AlertProperties extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "warning" | "success";
}

export const Alert = ({
  children,
  variant = "default",
  className = "",
  ...properties
}: AlertProperties) => {
  const variantStyles: { [key: string]: string } = {
    default: "bg-blue-50 text-blue-800 border-blue-200",
    destructive: "bg-red-50 text-red-800 border-red-200",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
    success: "bg-green-50 text-green-800 border-green-200",
  };

  return (
    <div
      className={`p-4 rounded-md border ${variantStyles[variant || "default"]} ${className}`}
      role="alert"
      {...properties}
    >
      {children}
    </div>
  );
};
Alert.displayName = "Alert";

interface AlertDescriptionProperties
  extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const AlertDescription = ({
  children,
  className = "",
  ...properties
}: AlertDescriptionProperties) => {
  return (
    <div className={`text-sm ${className}`} {...properties}>
      {children}
    </div>
  );
};
AlertDescription.displayName = "AlertDescription";

// Table components
export const Table = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ children, className = "", ...properties }, reference) => {
  return (
    <div className="w-full overflow-auto">
      <table
        ref={reference}
        className={`w-full caption-bottom text-sm ${className}`}
        {...properties}
      >
        {children}
      </table>
    </div>
  );
});
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ children, className = "", ...properties }, reference) => {
  return (
    <thead ref={reference} className={`${className}`} {...properties}>
      {children}
    </thead>
  );
});
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ children, className = "", ...properties }, reference) => {
  return (
    <tbody ref={reference} className={`${className}`} {...properties}>
      {children}
    </tbody>
  );
});
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ children, className = "", ...properties }, reference) => {
  return (
    <tr
      ref={reference}
      className={`border-b border-gray-200 transition-colors hover:bg-gray-50 ${className}`}
      {...properties}
    >
      {children}
    </tr>
  );
});
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ children, className = "", ...properties }, reference) => {
  return (
    <th
      ref={reference}
      className={`h-12 px-4 text-left align-middle font-medium text-gray-500 ${className}`}
      {...properties}
    >
      {children}
    </th>
  );
});
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ children, className = "", ...properties }, reference) => {
  return (
    <td
      ref={reference}
      className={`p-4 align-middle ${className}`}
      {...properties}
    >
      {children}
    </td>
  );
});
TableCell.displayName = "TableCell";

// Define specific props type for Tabs component
interface TabsProperties extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

// Tabs components
export const Tabs = ({
  children,
  value,
  onValueChange,
  className = "",
  ...properties
}: TabsProperties) => {
  return (
    <div className={`${className}`} {...properties}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // Pass value and onValueChange explicitly, add type assertion for child props
          return React.cloneElement(
            child as React.ReactElement<{
              value?: string;
              onValueChange?: (value: string) => void;
              parentValue?: string;
            }>,
            {
              value: child.type === TabsContent ? value : undefined, // Pass value only to TabsContent
              onValueChange:
                child.type === TabsTrigger ? onValueChange : undefined, // Pass onValueChange only to TabsTrigger
              parentValue: value, // Pass parent value to children for comparison
            }
          );
        }
        return child;
      })}
    </div>
  );
};
Tabs.displayName = "Tabs";

// Define specific props type for TabsList component
interface TabsListProperties extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const TabsList = ({
  children,
  className = "",
  ...properties
}: TabsListProperties) => {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}
      role="tablist"
      {...properties}
    >
      {children}
    </div>
  );
};
TabsList.displayName = "TabsList";

// Define specific props type for TabsTrigger component
interface TabsTriggerProperties
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  value: string;
  className?: string;
  onValueChange?: (value: string) => void; // Received from Tabs
  parentValue?: string; // Received from Tabs
}

export const TabsTrigger = ({
  children,
  value,
  className = "",
  onValueChange,
  parentValue,
  ...properties
}: TabsTriggerProperties) => {
  const isActive = parentValue === value;

  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? "bg-white text-blue-700 shadow-sm"
          : "text-gray-600 hover:text-gray-900"
      } ${className}`}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onValueChange?.(value)}
      {...properties}
    >
      {children}
    </button>
  );
};
TabsTrigger.displayName = "TabsTrigger";

// Define specific props type for TabsContent component
interface TabsContentProperties extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  value: string;
  className?: string;
  parentValue?: string; // Received from Tabs
}

export const TabsContent = ({
  children,
  value,
  className = "",
  parentValue,
  ...properties
}: TabsContentProperties) => {
  const isActive = parentValue === value;

  if (!isActive) return;

  return (
    <div
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
      role="tabpanel"
      tabIndex={0}
      {...properties}
    >
      {children}
    </div>
  );
};
TabsContent.displayName = "TabsContent";

// Define specific props type for Dialog component
interface DialogProperties extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  open?: boolean; // Add open state if controlled externally
  onOpenChange?: (open: boolean) => void; // Add handler for external control
}

// Dialog components
export const Dialog = ({
  children,
  open: controlledOpen,
  onOpenChange,
  ...properties
}: DialogProperties) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen === undefined ? internalOpen : controlledOpen;
  const setOpen = onOpenChange || setInternalOpen;

  return (
    <div {...properties}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // Pass open and setOpen explicitly, add type assertion for child props
          return React.cloneElement(
            child as React.ReactElement<{
              open?: boolean;
              setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
            }>,
            {
              open,
              setOpen: setOpen as React.Dispatch<React.SetStateAction<boolean>>, // Cast for internal state setter compatibility
            }
          );
        }
        return child;
      })}
    </div>
  );
};
Dialog.displayName = "Dialog";

// Define specific props type for DialogTrigger component
interface DialogTriggerProperties
  extends React.ComponentPropsWithoutRef<"button"> {
  children: React.ReactNode;
  asChild?: boolean;
  open?: boolean; // Received from Dialog
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Dialog
}

export const DialogTrigger = ({
  children,
  asChild,
  setOpen,
  ...properties
}: DialogTriggerProperties) => {
  const handleClick = () => {
    setOpen?.(true);
  };

  if (asChild && React.isValidElement(children)) {
  // Use React.ReactElement<React.HTMLAttributes<HTMLElement>> for better type safety
    const childOnClick =
      React.isValidElement<{ onClick?: (event: React.MouseEvent<HTMLElement>) => void }>(children) &&
      typeof children.props.onClick === "function"
        ? children.props.onClick
        : undefined;
    return React.cloneElement(
      children as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
      {
        ...properties,
         
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          childOnClick?.(event); // FIX: Use the correct variable name
          handleClick();
        },
      }
    );
  }

  return (
    <button {...properties} onClick={handleClick}>
      {children}
    </button>
  );
};
DialogTrigger.displayName = "DialogTrigger";

// Define specific props type for DialogContent component
interface DialogContentProperties
  extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  className?: string;
  open?: boolean; // Received from Dialog
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Dialog
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProperties>(
  ({ children, className = "", open, setOpen, ...properties }, reference) => {
    React.useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen?.(false);
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }, [setOpen]);

    if (!open) return null;

    return (
      <div
        ref={reference}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${className}`}
        {...properties}
         
        onClick={(_event_: React.MouseEvent<HTMLElement>) => {
          // Close on overlay click
          setOpen?.(false);
        }}
      >
        <div
          className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside content
        >
          {children}
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            onClick={() => setOpen?.(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>
    );
  }
);
DialogContent.displayName = "DialogContent";

// Define specific props type for DialogHeader component
interface DialogHeaderProperties extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const DialogHeader = ({
  children,
  className = "",
  ...properties
}: DialogHeaderProperties) => {
  return (
    <div
      className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
      {...properties}
    >
      {children}
    </div>
  );
};
DialogHeader.displayName = "DialogHeader";

// Define specific props type for DialogTitle component
interface DialogTitleProperties
  extends React.ComponentPropsWithoutRef<"h2"> {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProperties>(
  ({ children, className = "", ...properties }, reference) => {
    return (
      <h2
        ref={reference}
        className={`text-lg font-semibold leading-none tracking-tight ${className}`}
        {...properties}
      >
        {children}
      </h2>
    );
  }
);
DialogTitle.displayName = "DialogTitle";

// Define specific props type for DialogDescription component
interface DialogDescriptionProperties
  extends React.ComponentPropsWithoutRef<"p"> {
  children: React.ReactNode;
  className?: string;
}

export const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProperties>(
  ({ children, className = "", ...properties }, reference) => {
    return (
      <p
        ref={reference}
        className={`text-sm text-gray-500 ${className}`}
        {...properties}
      >
        {children}
      </p>
    );
  }
);
DialogDescription.displayName = "DialogDescription";

// Define specific props type for DialogFooter component
interface DialogFooterProperties extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter = ({
  children,
  className = "",
  ...properties
}: DialogFooterProperties) => {
  return (
    <div
      className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
      {...properties}
    >
      {children}
    </div>
  );
};
DialogFooter.displayName = "DialogFooter";

// Define specific props type for DatePicker component
interface DatePickerProperties {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  className?: string;
}

// DatePicker component (simplified example)
export const DatePicker = ({
  date,
  setDate,
  className = "",
}: DatePickerProperties) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDayClick = (day: Date) => {
    setDate(day);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        className="w-[280px] justify-start text-left font-normal"
        onClick={() => setIsOpen(!isOpen)}
      >
        {date ? date.toLocaleDateString() : <span>Pick a date</span>}
      </Button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-auto rounded-md border bg-white p-0 shadow-lg">
          {/* Basic Day Picker - Replace with a proper library like react-day-picker */}
          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              <div>Su</div>
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div>Sa</div>
              {/* Generate calendar days (this is highly simplified) */}
              {[...Array(31)].map((_, index) => {
                const day = new Date();
                day.setDate(index + 1);
                return (
                  <button
                    key={index}
                    className={`p-1 rounded-md hover:bg-gray-100 ${
                      date && date.getDate() === index + 1
                        ? "bg-blue-600 text-white"
                        : ""
                    }`}
                    onClick={() => handleDayClick(day)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
DatePicker.displayName = "DatePicker";

// Define specific props type for Calendar component (placeholder)
interface CalendarProperties {
  mode?: "single" | "multiple" | "range";
  selected?: Date | Date[] | { from?: Date; to?: Date };
  onSelect?: (
    day: Date | Date[] | { from?: Date; to?: Date } | undefined
  ) => void;
  className?: string;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  numberOfMonths?: number;
}

// Calendar component (placeholder - use react-day-picker)
export const Calendar = ({
   
  mode: _mode = "single", // FIX: Prefix unused variable
  selected,
  onSelect,
  className = "",
  month,
  onMonthChange,
  numberOfMonths = 1,
  ...properties
}: CalendarProperties) => {
  // State for the current displayed month if not controlled externally
  const [currentMonth, setCurrentMonth] = React.useState(month || new Date());

  React.useEffect(() => {
    if (month) {
      setCurrentMonth(month);
    }
  }, [month]);

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const handlePrevMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    handleMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    handleMonthChange(nextMonth);
  };

  // Simplified day rendering logic
  const renderDays = (offsetMonth: number) => {
    const monthToRender = new Date(currentMonth);
    monthToRender.setMonth(monthToRender.getMonth() + offsetMonth);
    const year = monthToRender.getFullYear();
    const monthIndex = monthToRender.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, monthIndex, 1).getDay(); // 0 = Sunday

    const days = [];
    // Add padding for days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`pad-start-${i}`} className="p-1.5"></div>);
    }
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, monthIndex, day);
      const isSelected = (
        selected instanceof Date &&
        currentDate.toDateString() === selected.toDateString()
      );
      // Add more complex selection logic for multiple/range modes

      days.push(
        <button
          key={day}
          className={`p-1.5 rounded-md text-center hover:bg-gray-100 ${
            isSelected ? "bg-blue-600 text-white hover:bg-blue-700" : ""
          }`}
           
          onClick={(_event: React.MouseEvent<HTMLElement>) => onSelect?.(currentDate)} // Pass the date object
        >
          {day}
        </button>
      );
    }
    return days;
  };

  return (
    <div className={`p-3 ${className}`} {...properties}>
      {[...Array(numberOfMonths)].map((_, index) => {
        const monthToRender = new Date(currentMonth);
        monthToRender.setMonth(monthToRender.getMonth() + index);
        return (
          <div key={index} className={numberOfMonths > 1 ? "mb-4" : ""}>
            <div className="flex justify-between items-center mb-2">
              {index === 0 && (
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="text-sm font-medium">
                {monthToRender.toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              {index === numberOfMonths - 1 && (
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
              <div>Su</div>
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div>Sa</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-sm">
              {renderDays(index)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
Calendar.displayName = "Calendar";

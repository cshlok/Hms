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
    const childOnClick =
      children.props && typeof children.props.onClick === "function"
        ? children.props.onClick
        : undefined;
    // Use React.ReactElement<React.HTMLAttributes<HTMLElement>> for better type safety
    return React.cloneElement(
      children as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
      {
        ...properties,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          childOnClick?.(e);
          handleClick();
        },
      }
    );
  }

  return (
    <button type="button" onClick={handleClick} {...properties}>
      {children}
    </button>
  );
};
DialogTrigger.displayName = "DialogTrigger";

// Define specific props type for DialogContent component
interface DialogContentProperties extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  open?: boolean; // Received from Dialog
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Dialog
  className?: string;
}

export const DialogContent = ({
  children,
  open,
  setOpen,
  className = "",
  ...properties
}: DialogContentProperties) => {
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen?.(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [setOpen]);

  if (!open) return;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={() => setOpen?.(false)}
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-lg bg-white p-6 shadow-lg ${className}`}
        onClick={(_event_) => e.stopPropagation()} // Prevent closing when clicking inside content
        {...properties}
      >
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          onClick={() => setOpen?.(false)}
        >
          <span className="sr-only">Close</span>
          {/* Simple X SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
};
DialogContent.displayName = "DialogContent";

// Define specific props type for DialogHeader component
interface DialogHeaderProperties extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const DialogHeader = ({
  children,
  className = "",
  ...properties
}: DialogHeaderProperties) => {
  return (
    <div className={`text-center sm:text-left ${className}`} {...properties}>
      {children}
    </div>
  );
};
DialogHeader.displayName = "DialogHeader";

// Define specific props type for DialogTitle component
interface DialogTitleProperties
  extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export const DialogTitle = ({
  children,
  className = "",
  ...properties
}: DialogTitleProperties) => {
  return (
    <h2
      className={`text-lg font-semibold leading-6 text-gray-900 ${className}`}
      {...properties}
    >
      {children}
    </h2>
  );
};
DialogTitle.displayName = "DialogTitle";

// Define specific props type for DialogFooter component
interface DialogFooterProperties extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const DialogFooter = ({
  children,
  className = "",
  ...properties
}: DialogFooterProperties) => {
  return (
    <div
      className={`mt-5 sm:mt-4 sm:flex sm:flex-row-reverse ${className}`}
      {...properties}
    >
      {children}
    </div>
  );
};
DialogFooter.displayName = "DialogFooter";

// Define specific props type for DialogClose component
interface DialogCloseProperties
  extends React.ComponentPropsWithoutRef<"button"> {
  children: React.ReactNode;
  asChild?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>; // Received from Dialog
}

export const DialogClose = ({
  children,
  asChild,
  setOpen,
  ...properties
}: DialogCloseProperties) => {
  const handleClick = () => {
    setOpen?.(false);
  };

  if (asChild && React.isValidElement(children)) {
    const childOnClick =
      children.props && typeof children.props.onClick === "function"
        ? children.props.onClick
        : undefined;
    return React.cloneElement(
      children as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
      {
        ...properties,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          childOnClick?.(e);
          handleClick();
        },
      }
    );
  }

  return (
    <button type="button" onClick={handleClick} {...properties}>
      {children}
    </button>
  );
};
DialogClose.displayName = "DialogClose";

// Calendar component (Simplified example, assuming react-day-picker is used)
// Needs react-day-picker installed: npm install react-day-picker
import { DayPicker, DayPickerProps } from "react-day-picker";
import "react-day-picker/dist/style.css";

type CalendarProperties = DayPickerProps & {
  className?: string;
  classNames?: DayPickerProps["classNames"];
  showOutsideDays?: boolean;
  // onDaySelect is part of DayPickerProps, no need to redefine unless overriding
};

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...properties
}: CalendarProperties) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={`p-3 ${className}`}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-gray-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        day_selected:
          "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
        day_today: "bg-gray-100 text-gray-900",
        day_outside: "text-gray-500 opacity-50",
        day_disabled: "text-gray-500 opacity-50",
        day_range_middle:
          "aria-selected:bg-gray-100 aria-selected:text-gray-900",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...properties }) => {
          if (orientation === "left") {
            return <ChevronLeft className="h-4 w-4" {...properties} />;
          }
          if (orientation === "right") {
            return <ChevronRight className="h-4 w-4" {...properties} />;
          }
          return <></>; // Return empty fragment instead of null
        },
      }}
      {...properties} // Pass rest of the props including onSelect, selected, etc.
    />
  );
}
Calendar.displayName = "Calendar";

// Skeleton component
interface SkeletonProperties extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...properties }: SkeletonProperties) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      {...properties}
    />
  );
}
Skeleton.displayName = "Skeleton";

// Select components (Simplified stubs, assuming Radix or similar)
// Needs proper implementation or library integration

export const Select = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);
Select.displayName = "Select";
export const SelectTrigger = ({ children }: { children: React.ReactNode }) => (
  <button>{children}</button>
);
SelectTrigger.displayName = "SelectTrigger";
export const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <span>{placeholder || "Select..."}</span>
);
SelectValue.displayName = "SelectValue";
export const SelectContent = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);
SelectContent.displayName = "SelectContent";
export const SelectItem = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}) => <div data-value={value}>{children}</div>;
SelectItem.displayName = "SelectItem";

// Export toast components and types explicitly to avoid naming conflicts
export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "./toast";
export type { ToastProps, ToastActionElement } from "./toast";
export { useToast, toast } from "./use-toast";
export type {
  ToasterToast,
  ToastContextProps,
  Toast as ToastType,
} from "./use-toast";

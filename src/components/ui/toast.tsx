import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// Need to import ToastPrimitives from '@radix-ui/react-toast'
// Install it first: npm install @radix-ui/react-toast

// Placeholder import until dependency is installed
// FIX: Use more specific types instead of 'any'
const ToastPrimitives = {
  Provider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Root: React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
    ({ children, ...properties }, reference) => (
      <div ref={reference} {...properties}>
        {children}
      </div>
    )
  ),
  Action: React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<"button">
  >(({ children, ...properties }, reference) => (
    <button ref={reference} {...properties}>
      {children}
    </button>
  )),
  Close: React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<"button">
  >(({ children, ...properties }, reference) => (
    <button ref={reference} {...properties}>
      {children}
    </button>
  )),
  Title: React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<"div">
  >(({ children, ...properties }, reference) => (
    <div ref={reference} {...properties}>
      {children}
    </div>
  )),
  Description: React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<"div">
  >(({ children, ...properties }, reference) => (
    <div ref={reference} {...properties}>
      {children}
    </div>
  )),
  Viewport: React.forwardRef<
    HTMLOListElement,
    React.ComponentPropsWithoutRef<"ol">
  >(({ children, ...properties }, reference) => (
    <ol ref={reference} {...properties}>
      {children}
    </ol>
  )),
};

// Assign displayNames after ToastPrimitives is defined
ToastPrimitives.Root.displayName = "ToastPrimitives.Root";
ToastPrimitives.Action.displayName = "ToastPrimitives.Action";
ToastPrimitives.Close.displayName = "ToastPrimitives.Close";
ToastPrimitives.Title.displayName = "ToastPrimitives.Title";
ToastPrimitives.Description.displayName = "ToastPrimitives.Description";
// FIX: Add missing displayName for Viewport
ToastPrimitives.Viewport.displayName = "ToastPrimitives.Viewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...properties }, reference) => {
  return (
    <ToastPrimitives.Root
      ref={reference}
      className={cn(toastVariants({ variant }), className)}
      {...properties}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...properties }, reference) => (
  <ToastPrimitives.Action
    ref={reference}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...properties}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...properties }, reference) => (
  <ToastPrimitives.Close
    ref={reference}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...properties}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...properties }, reference) => (
  <ToastPrimitives.Title
    ref={reference}
    className={cn("text-sm font-semibold", className)}
    {...properties}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...properties }, reference) => (
  <ToastPrimitives.Description
    ref={reference}
    className={cn("text-sm opacity-90", className)}
    {...properties}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProperties = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

const ToastProvider = ToastPrimitives.Provider;
const ToastViewport = ToastPrimitives.Viewport;

export {
  type ToastProperties as ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};

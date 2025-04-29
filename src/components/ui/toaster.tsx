"use client"

import {
  Toast, 
  ToastClose, 
  ToastDescription, 
  ToastProvider, 
  ToastTitle, 
  ToastViewport,
} from "@/components/ui/toast" 
import { useToast, ToasterToast } from "@/components/ui/use-toast" // Import the hook and the specific toast type

export function Toaster() {
  // Use the custom hook which now provides the toasts array
  const { toasts } = useToast()

  return (
    // Ensure ToastProvider is wrapping the application elsewhere, typically in layout.tsx
    // This component just renders the toasts based on the context state.
    <ToastProvider> 
      {toasts.map(function ({ id, title, description, action, ...props }: ToasterToast) { // Use the imported ToasterToast type
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action} 
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}


// Inspired by react-hot-toast library
import * as React from "react";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1_000_000;

// FIX: Add missing properties 'open' and 'onOpenChange' to the type
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  open?: boolean; // Added based on usage in dispatch
  onOpenChange?: (open: boolean) => void; // Added based on usage in dispatch
};

// FIX: Remove unused variable warning (or use it if intended)
// const actionTypes = {
//   ADD_TOAST: "ADD_TOAST",
//   UPDATE_TOAST: "UPDATE_TOAST",
//   DISMISS_TOAST: "DISMISS_TOAST",
//   REMOVE_TOAST: "REMOVE_TOAST",
// } as const

// FIX: Use action types directly if the constant object is removed
type ActionType = {
  ADD_TOAST: "ADD_TOAST";
  UPDATE_TOAST: "UPDATE_TOAST";
  DISMISS_TOAST: "DISMISS_TOAST";
  REMOVE_TOAST: "REMOVE_TOAST";
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
     
    dispatch({ type: "REMOVE_TOAST", toastId: toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST": {
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    }

    case "UPDATE_TOAST": {
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
    }

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        for (const toast of state.toasts) {
          addToRemoveQueue(toast.id);
        }
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case "REMOVE_TOAST": {
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    }
  }
};

type Toast = Omit<ToasterToast, "id">;

// We need a global dispatch function, typically provided by the Toaster component's context
// This is a placeholder and needs to be connected to the actual reducer instance
 
let dispatch: React.Dispatch<Action> = () => {};

function toast(properties: Toast) {
  const id = genId();

  const update = (properties_: ToasterToast) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...properties_, id } });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...properties,
      id,
      open: true, // This should now be valid
      onOpenChange: (open: boolean) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id: id,
    dismiss,
    update,
  };
}

// Keep the context and hook definition, but remove the incomplete parts
interface ToastContextProperties {
  toast: typeof toast;
  dismiss: (toastId?: string) => void;
  toasts: ToasterToast[]; // Add toasts array to the context props
}

const ToastContext = React.createContext<ToastContextProperties | undefined>(
  undefined
);

function useToast() {
  const context = React.useContext(ToastContext);

  if (context === undefined) {
    throw new Error(
      "useToast must be used within a Toaster component or a custom ToastProvider"
    );
  }

  return context;
}

// Function to set the global dispatch (used by the Toaster component)
export const setGlobalToastDispatch = (newDispatch: React.Dispatch<Action>) => {
  dispatch = newDispatch;
};

export { useToast, toast, ToastContext }; // Export context for provider usage
export type {
  ToasterToast,
  ToastContextProperties as ToastContextProps,
  Toast,
}; // Export types

export {
  type ToastProps,
  type ToastActionElement,
} from "@/components/ui/toast";

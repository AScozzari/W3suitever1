import { useState, useEffect, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

const toastState: ToastState = {
  toasts: [],
};

let listeners: Array<(state: ToastState) => void> = [];

function dispatch(action: { type: 'ADD_TOAST' | 'UPDATE_TOAST' | 'DISMISS_TOAST'; toast?: Toast }) {
  switch (action.type) {
    case 'ADD_TOAST':
      toastState.toasts = [action.toast!, ...toastState.toasts];
      break;
    case 'DISMISS_TOAST':
      toastState.toasts = toastState.toasts.filter((t) => t.id !== action.toast?.id);
      break;
    case 'UPDATE_TOAST':
      toastState.toasts = toastState.toasts.map((t) =>
        t.id === action.toast?.id ? { ...t, ...action.toast } : t
      );
      break;
  }
  
  listeners.forEach((listener) => {
    listener(toastState);
  });
}

let toastCount = 0;

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 4000, ...props }: Omit<Toast, 'id'>) => {
      const id = `${toastCount++}`;
      const newToast: Toast = {
        ...props,
        id,
        title,
        description,
        variant,
        duration,
      };

      dispatch({
        type: 'ADD_TOAST',
        toast: newToast,
      });

      if (duration > 0) {
        setTimeout(() => {
          dispatch({
            type: 'DISMISS_TOAST',
            toast: { id },
          });
        }, duration);
      }
    },
    []
  );

  const dismiss = useCallback((toastId?: string) => {
    dispatch({
      type: 'DISMISS_TOAST',
      toast: { id: toastId || '' },
    });
  }, []);

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
}
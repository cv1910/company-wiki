import { toast as sonnerToast, ExternalToast } from "sonner";
import { triggerHaptic } from "@/hooks/useHapticFeedback";

type ToastMessage = string | React.ReactNode;

// Wrapper für toast mit automatischem Haptic Feedback
export const toast = {
  success: (message: ToastMessage, options?: ExternalToast) => {
    triggerHaptic("success");
    return sonnerToast.success(message, options);
  },
  
  error: (message: ToastMessage, options?: ExternalToast) => {
    triggerHaptic("error");
    return sonnerToast.error(message, options);
  },
  
  warning: (message: ToastMessage, options?: ExternalToast) => {
    triggerHaptic("warning");
    return sonnerToast.warning(message, options);
  },
  
  info: (message: ToastMessage, options?: ExternalToast) => {
    triggerHaptic("notification");
    return sonnerToast.info(message, options);
  },
  
  // Passthrough für andere toast Methoden ohne Haptic
  message: sonnerToast,
  promise: sonnerToast.promise,
  custom: sonnerToast.custom,
  dismiss: sonnerToast.dismiss,
  loading: (message: ToastMessage, options?: ExternalToast) => {
    triggerHaptic("soft");
    return sonnerToast.loading(message, options);
  },
};

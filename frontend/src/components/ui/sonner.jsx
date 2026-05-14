import React from "react";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Cartoonix branded Toaster.
 *
 * Design:
 *  - Dark, glassy surface with a soft red glow (matches the brand).
 *  - Color-coded left accent bar per variant.
 *  - Crisp, friendly icons.
 *  - Smooth slide+blur animations (handled by Sonner).
 */
const Toaster = ({ ...props }) => {
  const ctx = useTheme();
  const theme = (ctx && ctx.theme) || "dark";

  return (
    <Sonner
      theme={theme}
      richColors={false}
      closeButton
      duration={4200}
      visibleToasts={4}
      gap={12}
      offset={20}
      expand={true}
      className="toaster group"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: "cartoonix-toast",
          title: "cartoonix-toast-title",
          description: "cartoonix-toast-description",
          actionButton: "cartoonix-toast-action",
          cancelButton: "cartoonix-toast-cancel",
          closeButton: "cartoonix-toast-close",
          success: "cartoonix-toast-success",
          error: "cartoonix-toast-error",
          warning: "cartoonix-toast-warning",
          info: "cartoonix-toast-info",
          loading: "cartoonix-toast-loading",
          default: "cartoonix-toast-default",
          icon: "cartoonix-toast-icon",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5" strokeWidth={2.2} />,
        error: <AlertCircle className="h-5 w-5" strokeWidth={2.2} />,
        warning: <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />,
        info: <Info className="h-5 w-5" strokeWidth={2.2} />,
        loading: <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.2} />,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

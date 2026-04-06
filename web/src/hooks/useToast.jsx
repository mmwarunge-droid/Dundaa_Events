import { useCallback } from "react";

/**
 * Minimal toast hook for apps that do not yet have a full toast provider.
 *
 * Current behavior:
 * - success/info -> console + browser alert
 * - error        -> console.error + browser alert
 *
 * Why this exists:
 * - AdminDashboardPage imports useToast from ../hooks/useToast
 * - Vercel build fails because the file is missing
 *
 * Future upgrade path:
 * - Replace alert() with a real toast UI system
 * - Keep the same public API: toast.success(), toast.error(), toast.info()
 */
export default function useToast() {
  const show = useCallback((type, message) => {
    const safeMessage =
      typeof message === "string" && message.trim()
        ? message.trim()
        : "Notification";

    // Log for developers
    if (type === "error") {
      console.error(`[toast:${type}] ${safeMessage}`);
    } else {
      console.log(`[toast:${type}] ${safeMessage}`);
    }

    // Minimal user-visible feedback
    if (typeof window !== "undefined") {
      window.alert(safeMessage);
    }
  }, []);

  const success = useCallback(
    (message) => {
      show("success", message);
    },
    [show]
  );

  const error = useCallback(
    (message) => {
      show("error", message);
    },
    [show]
  );

  const info = useCallback(
    (message) => {
      show("info", message);
    },
    [show]
  );

  const warning = useCallback(
    (message) => {
      show("warning", message);
    },
    [show]
  );

  return {
    success,
    error,
    info,
    warning
  };
}
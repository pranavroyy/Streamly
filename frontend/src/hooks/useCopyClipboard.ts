import { useState, useCallback } from "react";
import { copyToClipboard } from "@/lib/utils";

/**
 * Reusable hook for clipboard operations with automatic state feedback resetting.
 */
export function useCopyClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      const success = await copyToClipboard(text);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
      }
      return success;
    },
    [timeout]
  );

  return { copied, copy };
}

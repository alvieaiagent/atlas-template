"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const storageKey = "atlas-dismissed-mock-mode-banner";

export function MockModeBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(storageKey) === "1");
  }, []);

  function dismiss() {
    window.localStorage.setItem(storageKey, "1");
    setDismissed(true);
  }

  if (dismissed) {
    return null;
  }

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <p>
          Mock mode — marking &amp; scraping disabled. Add Supabase env to
          enable.
        </p>
        <Button
          aria-label="Dismiss mock mode banner"
          onClick={dismiss}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

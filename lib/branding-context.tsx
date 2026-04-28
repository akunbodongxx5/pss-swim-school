"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { SchoolBrandingDTO } from "@/lib/school-branding-server";

type BrandingContextValue = {
  branding: SchoolBrandingDTO;
  refreshBranding: () => Promise<void>;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial: SchoolBrandingDTO;
}) {
  const [branding, setBranding] = useState(initial);

  const refreshBranding = useCallback(async () => {
    const r = await fetch("/api/school-branding");
    if (!r.ok) return;
    const d = (await r.json()) as SchoolBrandingDTO;
    setBranding({
      schoolName: typeof d.schoolName === "string" ? d.schoolName : initial.schoolName,
      logoDataUrl: d.logoDataUrl ?? null,
      adminCanWriteStudentReports: typeof d.adminCanWriteStudentReports === "boolean" ? d.adminCanWriteStudentReports : initial.adminCanWriteStudentReports,
    });
  }, [initial.schoolName]);

  const value = useMemo(() => ({ branding, refreshBranding }), [branding, refreshBranding]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}

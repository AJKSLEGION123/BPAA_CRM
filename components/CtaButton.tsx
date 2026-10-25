"use client";
import { createContext, useContext } from "react";
import { contactLabel } from "@/lib/contact";

export const ShellContext = createContext<{ openCta: () => void }>({ openCta: () => {} });

/** The single call to action: opens «Что вам интересно?». */
export function CtaButton({ className = "", label = contactLabel }: { className?: string; label?: string }) {
  const { openCta } = useContext(ShellContext);
  return (
    <button type="button" onClick={openCta} className={`btn btn-primary ${className}`}>
      {label}
    </button>
  );
}

import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export function AssessmentDialog({ children }: { children: ReactNode }) {
  return createPortal(
    <div className="assessment-dialog-backdrop" role="presentation">
      {children}
    </div>,
    document.body,
  );
}

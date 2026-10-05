import type { ReactNode } from "react";

export function Overlay({
  variant,
  title,
  testId,
  onClose,
  children,
}: {
  variant: "drawer" | "modal";
  title: string;
  testId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="layer-backdrop" data-layer={variant}>
      <div
        className={variant === "drawer" ? "layer-drawer" : "layer-modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="layer-title"
        data-testid={testId}
      >
        <header className="layer-head">
          <h3 id="layer-title">{title}</h3>
          <button type="button" className="layer-close" onClick={onClose}>Close</button>
        </header>
        {children}
      </div>
    </div>
  );
}

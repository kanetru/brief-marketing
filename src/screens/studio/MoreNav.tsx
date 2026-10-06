import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { menuKeyAction, menuLeft } from "../../domain/workspace/menuPlacement";
import { MORE_NAV, type ManagerPanel } from "../../domain/workspace/managerNav";

export function MoreNav({
  panel,
  open,
  onToggle,
  onChoose,
}: {
  panel: ManagerPanel;
  open: boolean;
  onToggle: (open: boolean) => void;
  onChoose: (panel: ManagerPanel) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    if (!open) return;
    const anchor = buttonRef.current?.parentElement;
    const menu = menuRef.current;
    if (anchor && menu) {
      const rect = anchor.getBoundingClientRect();
      setShift(menuLeft(rect.left, menu.getBoundingClientRect().width, window.innerWidth, 12));
    }
    menu?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();
  }, [open]);

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const action = menuKeyAction(event.key, index, items.length);
    if (action.type === "none") return;
    if (action.type === "close") {
      event.preventDefault();
      onToggle(false);
      buttonRef.current?.focus();
      return;
    }
    event.preventDefault();
    items[action.index]?.focus();
  }

  return (
    <div className="more-anchor">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="more-menu"
        onClick={() => onToggle(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            onToggle(true);
          }
        }}
      >
        More
      </button>
      {open ? (
        <div id="more-menu" ref={menuRef} className="more-menu" role="menu" aria-label="More" style={shift ? { left: shift } : undefined} onKeyDown={onMenuKey}>
          {MORE_NAV.map(({ id, label }) => (
            <button key={id} type="button" role="menuitem" aria-current={panel === id ? "page" : undefined} onClick={() => onChoose(id)}>
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

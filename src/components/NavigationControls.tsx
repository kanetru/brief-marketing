interface NavigationControlsProps {
  showBack: boolean;
  showForward: boolean;
  onBack: () => void;
  onForward: () => void;
  forwardLabel: string;
  forwardDisabled?: boolean;
}

export function NavigationControls({
  showBack,
  showForward,
  onBack,
  onForward,
  forwardLabel,
  forwardDisabled = false,
}: NavigationControlsProps) {
  return (
    <div className="nav-controls">
      {showBack ? (
        <button type="button" className="text-button" onClick={onBack} data-testid="back">
          Back
        </button>
      ) : (
        <span />
      )}
      {showForward ? (
        <button
          type="button"
          className="primary-button"
          onClick={onForward}
          disabled={forwardDisabled}
          data-testid="continue"
        >
          {forwardLabel}
          <span aria-hidden="true">→</span>
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

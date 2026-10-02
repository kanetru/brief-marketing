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
  const spoken = forwardLabel === "Continue" ? "Keep going" : forwardLabel === "Let's begin" ? "Begin" : forwardLabel;
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
          {spoken}
          <span aria-hidden="true">→</span>
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

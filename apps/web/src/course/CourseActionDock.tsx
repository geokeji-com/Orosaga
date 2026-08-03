import { LoaderCircle } from "lucide-react";
import type { CourseAction } from "./course-action";

type CourseActionDockProps = {
  action: CourseAction;
  onAction: () => void;
};

export function CourseActionDock({ action, onAction }: CourseActionDockProps) {
  const hintId = action.hint ? "course-action-hint" : undefined;
  const shouldAnnounce = action.busy;

  return (
    <div
      className="course-action-dock"
      role="group"
      aria-label="本步学习操作"
      aria-busy={action.busy}
    >
      <button
        className={
          action.busy ? "course-action-button is-busy" : "course-action-button"
        }
        type="button"
        disabled={action.disabled}
        aria-describedby={hintId}
        aria-keyshortcuts={action.supportsEnter ? "Space" : undefined}
        onClick={onAction}
      >
        {action.busy && (
          <LoaderCircle
            className="course-action-spinner"
            size={18}
            aria-hidden="true"
          />
        )}
        <span className="course-action-label">{action.label}</span>
        {action.supportsEnter && (
          <kbd className="course-action-key" aria-hidden="true">
            空格
          </kbd>
        )}
      </button>
      {action.hint && (
        <span className="course-action-hint" id={hintId}>
          {action.hint}
        </span>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {shouldAnnounce ? action.label : ""}
      </span>
    </div>
  );
}

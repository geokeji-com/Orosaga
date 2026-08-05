export class ActiveDurationTracker {
  private accumulatedMs = 0;
  private activeSince: number | null;

  constructor(now: number, active: boolean) {
    this.activeSince = active ? now : null;
  }

  setActive(active: boolean, now: number) {
    if (active && this.activeSince === null) {
      this.activeSince = now;
      return;
    }
    if (!active && this.activeSince !== null) {
      this.accumulatedMs += Math.max(0, now - this.activeSince);
      this.activeSince = null;
    }
  }

  read(now: number) {
    return Math.max(
      0,
      Math.round(
        this.accumulatedMs +
          (this.activeSince === null ? 0 : Math.max(0, now - this.activeSince)),
      ),
    );
  }

  reset(now: number, active: boolean) {
    this.accumulatedMs = 0;
    this.activeSince = active ? now : null;
  }

  readAndReset(now: number, active: boolean) {
    const elapsed = this.read(now);
    this.reset(now, active);
    return elapsed;
  }
}

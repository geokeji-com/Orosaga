import { describe, expect, it } from "vitest";
import {
  assessProductionState,
  type ProductionCounts,
} from "./reconcile-production-operation.js";

const now = new Date("2026-07-22T10:00:00.000Z");
const counts: ProductionCounts = {
  activeEmployees: 33,
  activeLegacyUsers: 0,
  assets: 31,
  camps: 16,
  legacyDescendants: 253,
  realSourceCamps: 16,
  systemLinks: 7,
  workflowStages: 6,
  doneItems: 18,
  admins: 2,
  unsafeLinksDisabled: 2,
  freshRealSources: 1,
};

describe("assessProductionState", () => {
  it("uses the latest organization snapshot as the employee expectation", () => {
    const report = assessProductionState(
      counts,
      { discovered: 33, finishedAt: new Date("2026-07-22T09:30:00.000Z") },
      { discovered: 253, finishedAt: new Date("2026-07-22T09:40:00.000Z") },
      now,
    );

    expect(report.ok).toBe(true);
    expect(report.migrationBaseline.legacyEmployeeProfiles).toBe(30);
    expect(report.expectations.activeEmployeesFromOrganizationSync).toBe(33);
  });

  it("fails when no successful organization sync exists", () => {
    const report = assessProductionState(
      counts,
      null,
      { discovered: 253, finishedAt: new Date("2026-07-22T09:40:00.000Z") },
      now,
    );

    expect(report.ok).toBe(false);
    expect(report.checks.organizationSyncPresent).toBe(false);
    expect(report.checks.activeEmployeesMatchOrganization).toBe(false);
  });

  it("fails stale synchronization and active legacy users", () => {
    const report = assessProductionState(
      { ...counts, activeLegacyUsers: 1 },
      { discovered: 33, finishedAt: new Date("2026-07-22T08:59:59.000Z") },
      { discovered: 253, finishedAt: new Date("2026-07-22T08:00:00.000Z") },
      now,
    );

    expect(report.ok).toBe(false);
    expect(report.checks.organizationSyncFresh).toBe(false);
    expect(report.checks.wikiSyncFresh).toBe(false);
    expect(report.checks.noActiveLegacyUsers).toBe(false);
  });

  it("fails when active employees diverge from the Feishu snapshot", () => {
    const report = assessProductionState(
      { ...counts, activeEmployees: 32 },
      { discovered: 33, finishedAt: new Date("2026-07-22T09:30:00.000Z") },
      { discovered: 253, finishedAt: new Date("2026-07-22T09:40:00.000Z") },
      now,
    );

    expect(report.ok).toBe(false);
    expect(report.checks.activeEmployeesMatchOrganization).toBe(false);
  });
});

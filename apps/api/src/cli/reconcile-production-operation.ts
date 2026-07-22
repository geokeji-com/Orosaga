export const productionBaseline = {
  legacyEmployeeProfiles: 30,
  assets: 31,
  camps: 16,
  legacyDescendants: 253,
  systemLinks: 7,
  workflowStages: 6,
  doneItems: 18,
  admins: 2,
  unsafeLinksDisabled: 2,
} as const;

export type ProductionCounts = {
  activeEmployees: number;
  activeLegacyUsers: number;
  assets: number;
  camps: number;
  legacyDescendants: number;
  realSourceCamps: number;
  systemLinks: number;
  workflowStages: number;
  doneItems: number;
  admins: number;
  unsafeLinksDisabled: number;
  freshRealSources: number;
};

export type LatestSync = {
  discovered: number;
  finishedAt: Date | null;
} | null;

const MAX_SYNC_AGE_MS = 60 * 60_000;
const MAX_FUTURE_SKEW_MS = 5 * 60_000;

function syncAgeMinutes(sync: LatestSync, now: Date) {
  if (!sync?.finishedAt) return null;
  return Math.round((now.getTime() - sync.finishedAt.getTime()) / 60_000);
}

function isFresh(sync: LatestSync, now: Date) {
  if (!sync?.finishedAt) return false;
  const age = now.getTime() - sync.finishedAt.getTime();
  return age >= -MAX_FUTURE_SKEW_MS && age <= MAX_SYNC_AGE_MS;
}

export function assessProductionState(
  counts: ProductionCounts,
  organizationSync: LatestSync,
  wikiSync: LatestSync,
  now = new Date(),
) {
  const expectedActiveEmployees = organizationSync?.discovered ?? null;
  const checks = {
    organizationSyncPresent: Boolean(organizationSync),
    organizationSyncFresh: isFresh(organizationSync, now),
    wikiSyncPresent: Boolean(wikiSync),
    wikiSyncFresh: isFresh(wikiSync, now),
    activeEmployeesMatchOrganization:
      expectedActiveEmployees !== null &&
      counts.activeEmployees === expectedActiveEmployees,
    noActiveLegacyUsers: counts.activeLegacyUsers === 0,
    assets: counts.assets === productionBaseline.assets,
    camps: counts.camps === productionBaseline.camps,
    legacyDescendants:
      counts.legacyDescendants === productionBaseline.legacyDescendants,
    realSourceCamps: counts.realSourceCamps === productionBaseline.camps,
    systemLinks: counts.systemLinks === productionBaseline.systemLinks,
    workflowStages: counts.workflowStages === productionBaseline.workflowStages,
    doneItems: counts.doneItems === productionBaseline.doneItems,
    admins: counts.admins >= productionBaseline.admins,
    unsafeLinksDisabled:
      counts.unsafeLinksDisabled === productionBaseline.unsafeLinksDisabled,
    freshRealSources: counts.freshRealSources >= 1,
  };

  return {
    ok: Object.values(checks).every(Boolean),
    migrationBaseline: {
      legacyEmployeeProfiles: productionBaseline.legacyEmployeeProfiles,
    },
    expectations: {
      activeEmployeesFromOrganizationSync: expectedActiveEmployees,
      maximumSyncAgeMinutes: MAX_SYNC_AGE_MS / 60_000,
    },
    sync: {
      organization: {
        discovered: expectedActiveEmployees,
        finishedAt: organizationSync?.finishedAt?.toISOString() ?? null,
        ageMinutes: syncAgeMinutes(organizationSync, now),
      },
      wiki: {
        discovered: wikiSync?.discovered ?? null,
        finishedAt: wikiSync?.finishedAt?.toISOString() ?? null,
        ageMinutes: syncAgeMinutes(wikiSync, now),
      },
    },
    counts,
    checks,
  };
}

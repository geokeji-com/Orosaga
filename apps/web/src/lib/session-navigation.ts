export function replaceWithLogin(returnTo?: string) {
  const target = returnTo
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/login";
  window.location.replace(target);
}

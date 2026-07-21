const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100";

async function request(path, init = {}, expected = 200) {
  const response = await fetch(`${base}${path}`, init);
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(
      `${init.method ?? "GET"} ${path}: expected ${expected}, received ${response.status}: ${body.slice(0, 200)}`,
    );
  }
  return response;
}

await request("/healthz");
await request("/readyz", {}, 401);
await request("/api/v1/pages/company", {}, 401);

const login = await request("/auth/dev-login", { method: "POST" });
const cookies = login.headers
  .getSetCookie()
  .map((value) => value.split(";")[0]);
const cookie = cookies.join("; ");
const csrf = cookies
  .find((value) => value.startsWith("orosaga_csrf="))
  ?.split("=")
  .slice(1)
  .join("=");
if (!csrf) throw new Error("Development login did not set CSRF cookie");
const authenticated = (method = "GET", body) => ({
  method,
  headers: {
    cookie,
    ...(method === "GET"
      ? {}
      : { "x-csrf-token": csrf, "content-type": "application/json" }),
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

const me = await (await request("/api/v1/me", authenticated())).json();
if (me.role !== "ADMIN" || me.csrfToken !== csrf)
  throw new Error("Development session is not an admin session");
await request("/readyz", authenticated());
const departments = await (
  await request("/api/v1/organization/departments", authenticated())
).json();
const camps = await (await request("/api/v1/camps", authenticated())).json();
const systems = await (
  await request("/api/v1/system-links", authenticated())
).json();
if (departments.length !== 5 || camps.length !== 16 || systems.length !== 5)
  throw new Error("Seeded read API counts do not match baseline");

const page = await (
  await request("/api/v1/pages/company", authenticated())
).json();
await request(
  `/api/v1/admin/pages/${page.id}`,
  {
    ...authenticated("PUT", {
      expectedVersion: page.version,
      content: page.content,
      changeSummary: "API smoke publish",
    }),
    headers: { cookie, "content-type": "application/json" },
  },
  403,
);
const published = await (
  await request(
    `/api/v1/admin/pages/${page.id}`,
    authenticated("PUT", {
      expectedVersion: page.version,
      content: page.content,
      changeSummary: "API smoke publish",
    }),
  )
).json();
if (published.version !== page.version + 1)
  throw new Error("Publish did not increment version");
await request(
  `/api/v1/admin/pages/${page.id}`,
  authenticated("PUT", {
    expectedVersion: page.version,
    content: page.content,
    changeSummary: "stale write",
  }),
  409,
);
const validation = await request(
  `/api/v1/admin/pages/${page.id}`,
  authenticated("PUT", { expectedVersion: "invalid" }),
  400,
);
const validationBody = await validation.json();
if (validationBody.code !== "VALIDATION_ERROR" || !validationBody.fieldErrors)
  throw new Error("Validation errors are not using the shared envelope");

const sources = await (
  await request("/api/v1/admin/knowledge-sources", authenticated())
).json();
if (!Array.isArray(sources) || sources.length < 1)
  throw new Error("Seeded knowledge source is missing");
const source = sources[0];
const savedSource = await (
  await request(
    `/api/v1/admin/knowledge-sources/${source.id}`,
    authenticated("PUT", {
      expectedVersion: source.version,
      name: source.name,
      spaceId: source.spaceId,
      rootNodeToken: source.rootNodeToken,
      excludedTokens: source.excludedTokens,
      intervalMins: source.intervalMins,
      enabled: source.enabled,
    }),
  )
).json();
if (savedSource.version !== source.version + 1)
  throw new Error("Knowledge source publish did not increment version");

const workflow = await (
  await request("/api/v1/workflows/geo-operating", authenticated())
).json();
await request(
  `/api/v1/admin/users/${me.id}/role`,
  authenticated("PUT", { role: "EDITOR" }),
);
await request(
  `/api/v1/admin/resources/workflow/${workflow.id}/revisions`,
  authenticated(),
);
await request(
  `/api/v1/admin/resources/system-link/${systems[0].id}/revisions`,
  authenticated(),
  403,
);
await request("/auth/dev-login", { method: "POST" });
await request(
  `/api/v1/admin/users/${me.id}/role`,
  authenticated("PUT", { role: "EMPLOYEE" }),
);
await request("/api/v1/pages/company", authenticated());
await request(`/api/v1/admin/pages/${page.id}/revisions`, authenticated(), 403);
await request("/auth/dev-login", { method: "POST" });

const search = await (
  await request("/api/v1/search?q=技术", authenticated())
).json();
if (!Array.isArray(search.items))
  throw new Error("Search response is not cursor-shaped");
await request("/api/v1/logout", authenticated("POST"), 204);
await request("/api/v1/me", { headers: { cookie } }, 401);
console.log(
  "API smoke passed: auth, three-role RBAC, CSRF, validation, reads, versioned publishing, source configuration, search and logout.",
);

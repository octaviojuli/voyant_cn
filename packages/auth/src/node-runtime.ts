/**
 * Better Auth Node runtime for Hono.
 *
 * agent-quality: file-size exception -- Auth handler keeps local and Voyant Cloud auth flows co-located until the route surface is split by auth mode.
 *
 * Mounts Better Auth at /auth/* for authentication operations.
 * Same-origin — no CORS needed. Session cookies work naturally.
 *
 * Also provides /auth/status (user provisioning) and /auth/me (user info).
 */

import { type NodeDatabaseEnv, openNodeDatabase } from "@voyant-travel/db/runtime"
import {
  authUser,
  cloudAuthUserLinks,
  type SelectApikey,
  userProfilesTable,
} from "@voyant-travel/db/schema/iam"
import type { Reporter, VoyantDb, VoyantRequestAuthContext } from "@voyant-travel/hono"
import {
  handleApiError,
  reportException,
  requestId,
} from "@voyant-travel/hono/middleware/error-boundary"
import { getRequestId } from "@voyant-travel/hono/observability"
import type { AccessCatalog } from "@voyant-travel/types/api-keys"
import { scopesForRoleWithPresets } from "@voyant-travel/types/member-roles"
import { eq, sql } from "drizzle-orm"
import { type Context, Hono } from "hono"
import {
  createVoyantCloudAdminAuthPlugin,
  revalidateVoyantCloudAdminAuthSession,
  revalidateVoyantCloudAdminAuthUser,
} from "./cloud-admin-session.js"
import { buildClearCloudAdminAuthStateCookie, createCloudAdminAuthStart } from "./cloud-broker.js"
import {
  type CreateBetterAuthOptions,
  createBetterAuth,
  handleApiTokenManagementRequest,
  handleOrganizationMembersRequest,
} from "./server.js"
import { ensureCurrentUserProfile } from "./workspace.js"

// Type ctx so that `c.get("db")` resolves to the parent app's middleware-
// set `VoyantDb` from the deployment's database lifecycle adapter. Without
// this, the sub-app sees `unknown` for context vars.
type OperatorAuthMode = "local" | "voyant-cloud"

export interface OperatorAuthNodeEnv extends NodeDatabaseEnv {
  API_BASE_URL?: string
  APP_URL?: string
  AUTH_COOKIE_DOMAIN?: string
  BETTER_AUTH_SECRET: string
  CORS_ALLOWLIST?: string
  DASH_BASE_URL?: string
  EMAIL_FROM?: string
  SESSION_CLAIMS_SECRET: string
  VOYANT_ADMIN_AUTH_MODE?: string
  VOYANT_AUTH_LOG_SECRET_FALLBACKS?: string
  VOYANT_CLOUD_ADMIN_AUTH_AUDIENCE?: string
  VOYANT_CLOUD_ADMIN_AUTH_CLIENT_TOKEN?: string
  VOYANT_CLOUD_ADMIN_AUTH_EXCHANGE_URL?: string
  VOYANT_CLOUD_ADMIN_AUTH_JWKS_URL?: string
  VOYANT_CLOUD_ADMIN_AUTH_REVALIDATE_URL?: string
  VOYANT_CLOUD_ADMIN_AUTH_START_URL?: string
  VOYANT_CLOUD_APP_ID?: string
  VOYANT_CLOUD_DEPLOYMENT_ID?: string
  VOYANT_CLOUD_ENVIRONMENT?: string
  VOYANT_OPERATOR_BROWSER_EVIDENCE?: string
}

export interface OperatorCurrentUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  locale: string
  timezone: string | null
  uiPrefs: unknown
  isSuperAdmin: boolean
  isSupportUser: boolean
  createdAt: string
  profilePictureUrl: string | null
}

export type OperatorAuthBootstrapStatus = {
  hasUsers: boolean
  authMode?: OperatorAuthMode
}

type BetterAuthAdvancedOptions = NonNullable<CreateBetterAuthOptions["advanced"]>

/** Resolve Better Auth's standard cross-subdomain cookie policy for Node hosts. */
export function buildBetterAuthCookieAdvancedOptions(
  env: Pick<OperatorAuthNodeEnv, "AUTH_COOKIE_DOMAIN">,
):
  | Pick<BetterAuthAdvancedOptions, "crossSubDomainCookies" | "defaultCookieAttributes">
  | undefined {
  const domain = env.AUTH_COOKIE_DOMAIN?.trim()
  if (!domain) return undefined

  return {
    crossSubDomainCookies: { enabled: true, domain },
    defaultCookieAttributes: { domain },
  }
}

export interface OperatorAuthEmailSender {
  sendResetPassword: (input: {
    user: { email: string; name: string }
    url: string
  }) => Promise<void>
  sendVerificationOtp: (input: { email: string; otp: string; type: string }) => Promise<void>
}

export interface CreateOperatorAuthNodeRuntimeOptions<Env extends OperatorAuthNodeEnv> {
  accessCatalog: AccessCatalog
  appName: string
  authMode: OperatorAuthMode
  reporter: Reporter
  openDatabase?: (env: Env) => { db: VoyantDb; dispose: () => Promise<void> }
  cookieAdvanced?: (
    env: Env,
  ) =>
    | Pick<BetterAuthAdvancedOptions, "crossSubDomainCookies" | "defaultCookieAttributes">
    | undefined
  resolveEmailSender?: (env: Env) => OperatorAuthEmailSender | null
}

export function createOperatorAuthNodeRuntime<Env extends OperatorAuthNodeEnv>(
  runtimeOptions: CreateOperatorAuthNodeRuntimeOptions<Env>,
) {
  type AuthHonoEnv = { Bindings: Env; Variables: { db: VoyantDb } }

  const openDatabase =
    runtimeOptions.openDatabase ??
    ((env: Env) => {
      const resource = openNodeDatabase(env)
      return { db: resource.db as VoyantDb, dispose: resource.dispose }
    })

  const auth = new Hono<AuthHonoEnv>()
  // This lean auth app is dispatched around `createVoyantApp` (see
  // api-dispatch.ts), so it must mint/propagate the correlation id and wire
  // the reporter itself — otherwise auth 5xx are an observability blind spot and
  // the user-facing requestId wouldn't be findable (RFC voyant#1553).
  auth.use("*", requestId)
  // `onError` only fires on THROWN exceptions. Several handlers (e.g.
  // /auth/status, the cloud token/revalidate/callback paths) instead RETURN a
  // 5xx via `c.json(..., 50x)`; those bypass `onError`, and this lean app is
  // dispatched around `createVoyantApp` so the framework's auth status-bridge
  // (`mountAuthForwarding`) never runs either. Bridge returned 5xx to the
  // reporter here so they aren't an observability blind spot (RFC voyant#1553).
  // Thrown errors skip this middleware's post-`next()` code (the rejection
  // propagates straight to `onError`), so there's no double report.
  auth.use("*", async (c, next) => {
    await next()
    if (c.res.status >= 500) {
      reportException(runtimeOptions.reporter, c, {
        requestId: getRequestId() ?? "",
        app: runtimeOptions.appName,
        error: new Error(`auth handler returned HTTP ${c.res.status}`),
        context: { path: c.req.path, method: c.req.method, status: c.res.status, surface: "auth" },
      })
    }
  })
  auth.onError((err, c) =>
    handleApiError(err, c, { reporter: runtimeOptions.reporter, appName: runtimeOptions.appName }),
  )

  const DEFAULT_APP_URL = "http://localhost:3300"
  const CLOUD_BETTER_AUTH_ALLOWLIST = new Set([
    "/auth/get-session",
    "/auth/jwks",
    "/auth/session",
    "/auth/sign-out",
    "/auth/token",
  ])

  function resolveOperatorAuthMode(_env: Env): OperatorAuthMode {
    return runtimeOptions.authMode
  }

  function isVoyantCloudAuthMode(env: Env): boolean {
    return resolveOperatorAuthMode(env) === "voyant-cloud"
  }

  function isCloudAllowedBetterAuthRoute(request: Request): boolean {
    const url = new URL(request.url)
    const pathname = url.pathname.replace(/\/+$/, "") || "/"
    return CLOUD_BETTER_AUTH_ALLOWLIST.has(pathname)
  }

  function localAuthDisabledResponse(c: Context<AuthHonoEnv>) {
    return c.json({ error: "Local auth routes are disabled in Voyant Cloud auth mode" }, 404)
  }

  function cloudAuthNotConfiguredResponse(c: Context<AuthHonoEnv>) {
    return c.json({ error: "Voyant Cloud auth broker is not configured yet" }, 501)
  }

  function normalizeUrl(url: string): string {
    return url.trim().replace(/\/$/, "")
  }

  function getAppUrl(env: Env): string {
    const candidates = [
      env.APP_URL,
      env.DASH_BASE_URL,
      env.CORS_ALLOWLIST?.split(",")[0],
      DEFAULT_APP_URL,
    ]

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return normalizeUrl(candidate)
      }
    }

    return DEFAULT_APP_URL
  }

  function getTrustedOrigins(env: Env): string[] {
    return Array.from(
      new Set(
        [env.APP_URL, env.DASH_BASE_URL, ...(env.CORS_ALLOWLIST ?? "").split(",")]
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).map(normalizeUrl)
  }

  function getAuthBaseUrl(env: Env): string {
    // entry.ts strips /api before delegating to the Hono app, so Better Auth
    // sees paths like /auth/*. Its baseURL must be the origin only (no /api).
    const appUrl = getAppUrl(env)
    try {
      const parsed = new URL(appUrl)
      return `${parsed.protocol}//${parsed.host}`
    } catch {
      return appUrl
    }
  }

  function getPublicApiBaseUrl(env: Env): string {
    const candidate = env.API_BASE_URL?.trim() || env.APP_URL?.trim() || `${getAppUrl(env)}/api`
    const normalized = normalizeUrl(candidate)

    try {
      const parsed = new URL(normalized)
      if (parsed.pathname === "/" || parsed.pathname === "") {
        parsed.pathname = "/api"
        return normalizeUrl(parsed.toString())
      }
    } catch {
      return normalized
    }

    return normalized
  }

  function getCloudAuthStartConfig(env: Env) {
    const deploymentId = env.VOYANT_CLOUD_DEPLOYMENT_ID?.trim()
    const cloudAuthStartUrl = env.VOYANT_CLOUD_ADMIN_AUTH_START_URL?.trim()
    if (!deploymentId || !cloudAuthStartUrl) return null

    return {
      cloudAuthStartUrl,
      deploymentId,
      adminCallbackUrl: `${getPublicApiBaseUrl(env)}/auth/cloud/callback`,
      cookieSecret: env.SESSION_CLAIMS_SECRET,
      appId: env.VOYANT_CLOUD_APP_ID?.trim() || undefined,
      environment: env.VOYANT_CLOUD_ENVIRONMENT?.trim() || undefined,
    }
  }

  function getCloudAuthExchangeConfig(env: Env) {
    const deploymentId = env.VOYANT_CLOUD_DEPLOYMENT_ID?.trim()
    const exchangeUrl = env.VOYANT_CLOUD_ADMIN_AUTH_EXCHANGE_URL?.trim()
    const assertionJwksUrl = env.VOYANT_CLOUD_ADMIN_AUTH_JWKS_URL?.trim()
    const clientToken = env.VOYANT_CLOUD_ADMIN_AUTH_CLIENT_TOKEN?.trim()
    if (!deploymentId || !exchangeUrl || !assertionJwksUrl || !clientToken) return null

    return {
      exchangeUrl,
      deploymentId,
      clientToken,
      assertionJwksUrl,
      assertionAudience: env.VOYANT_CLOUD_ADMIN_AUTH_AUDIENCE?.trim() || deploymentId,
    }
  }

  function getCloudAuthRevalidateConfig(env: Env) {
    const deploymentId = env.VOYANT_CLOUD_DEPLOYMENT_ID?.trim()
    const revalidateUrl = env.VOYANT_CLOUD_ADMIN_AUTH_REVALIDATE_URL?.trim()
    const clientToken = env.VOYANT_CLOUD_ADMIN_AUTH_CLIENT_TOKEN?.trim()
    if (!deploymentId || !revalidateUrl || !clientToken) return null

    return {
      revalidateUrl,
      deploymentId,
      clientToken,
    }
  }

  function isLocalRequest(request: Request): boolean {
    const hostname = new URL(request.url).hostname
    return hostname === "127.0.0.1" || hostname === "localhost"
  }

  function shouldUseBrowserEvidenceAuthFallback(env: Env, request: Request): boolean {
    return env.VOYANT_OPERATOR_BROWSER_EVIDENCE === "1" && isLocalRequest(request)
  }

  function allowAuthSecretLogging(env: Env): boolean {
    return env.VOYANT_AUTH_LOG_SECRET_FALLBACKS === "1"
  }

  /**
   * Build a Better Auth instance backed by a caller-provided drizzle
   * client. The caller owns the Pool lifecycle (open before, dispose
   * after) so the same Pool can serve both the auth lookup and any
   * subsequent queries the route does — without spinning up a second
   * connection per request.
   *
   * The deployment decides whether this is a request-scoped or resident Node
   * pool. The Better Auth instance is not cached independently of that owner.
   */
  interface BuildBetterAuthOptions {
    customerSignup?: boolean
  }

  function buildBetterAuth(env: Env, db: VoyantDb, options: BuildBetterAuthOptions = {}) {
    const emailSender = runtimeOptions.resolveEmailSender?.(env)
    const cloudAuthExchange = isVoyantCloudAuthMode(env) ? getCloudAuthExchangeConfig(env) : null
    const authDb = db as NonNullable<Parameters<typeof createBetterAuth>[0]>["db"]
    const cloudAuthDb = db as Parameters<typeof createVoyantCloudAdminAuthPlugin>[0]["db"]

    return createBetterAuth({
      // `db` is a `NeonDatabase` (neon-serverless WebSocket); the
      // `CreateBetterAuthOptions.db` type still references the older
      // `getDb` return union (postgres-js + neon-http). Drizzle's
      // PgDatabase surface is identical across flavors at runtime, so
      // the cast is structurally safe — better-auth's drizzleAdapter
      // works on any PgDatabase. See #500 for context.
      db: authDb,
      secret: env.BETTER_AUTH_SECRET,
      baseURL: getAuthBaseUrl(env),
      basePath: "/auth",
      trustedOrigins: getTrustedOrigins(env),
      advanced: (runtimeOptions.cookieAdvanced ?? buildBetterAuthCookieAdvancedOptions)(env),
      customerSignupSurfaces: options.customerSignup ? ["customer"] : undefined,
      plugins: cloudAuthExchange
        ? [
            createVoyantCloudAdminAuthPlugin({
              db: cloudAuthDb,
              cookieSecret: env.SESSION_CLAIMS_SECRET,
              exchange: cloudAuthExchange,
            }),
          ]
        : undefined,
      sendResetPassword: async ({ user, url }) => {
        if (!emailSender) {
          // No email provider (e.g. local dev without a sending domain): with the
          // debug flag on, log the link to the console instead of sending;
          // otherwise fail loudly. Never bypasses a configured cloud sender.
          if (allowAuthSecretLogging(env)) {
            console.info(`[auth] reset-password (debug fallback) -> ${user.email}: ${url}`)
            return
          }
          throw new Error("Password reset email provider is not configured")
        }
        await emailSender.sendResetPassword({ user, url })
      },
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (!emailSender) {
          // No email provider (e.g. local dev without a sending domain): with the
          // debug flag on, log the OTP to the console instead of sending;
          // otherwise fail loudly. Never bypasses a configured cloud sender.
          if (allowAuthSecretLogging(env)) {
            console.info(`[auth] verification-otp (debug fallback) [${type}] -> ${email}: ${otp}`)
            return
          }
          throw new Error("Verification OTP email provider is not configured")
        }
        await emailSender.sendVerificationOtp({ email, otp, type })
      },
    })
  }

  function rewriteCustomerAuthRequest(request: Request): Request {
    const url = new URL(request.url)
    url.pathname = url.pathname.replace("/auth/customer", "/auth")
    return new Request(url, request)
  }

  const FULL_ACCESS_SCOPES = ["*"]

  function scopesForOperatorRole(role: string | null | undefined): string[] | null {
    return scopesForRoleWithPresets(role, runtimeOptions.accessCatalog.presets)
  }

  /**
   * Resolve a member's RBAC scope set for the request (`resource:action` strings,
   * shared with API keys — see @voyant-travel/types/member-roles, RFC voyant#2085).
   *
   * Phase 1: storage + seam are wired but default to full access, so behavior is
   * unchanged until an admin assigns permissions (Phase 2) and routes gate on them
   * (Phase 3).
   *  - voyant-cloud: assertion-mirrored `cloud_auth_user_links.scopes` if the
   *    platform sent them, else the role bundle for `roleSlug`, else full access.
   *  - local: an explicitly assigned non-wildcard `user_profiles.permissions`
   *    set verbatim; otherwise the member is a full-access owner/admin (the
   *    local role model, see `resolveLocalRole` in the local team adapter), so
   *    the role bundle is unioned with the project's staff access presets.
   *    That union is what carries explicit-wildcard scopes (e.g.
   *    `action-ledger:read`) that the `*` scope can never satisfy.
   */
  async function resolveMemberScopes(db: VoyantDb, env: Env, userId: string): Promise<string[]> {
    if (isVoyantCloudAuthMode(env)) {
      const [link] = await db
        .select({ scopes: cloudAuthUserLinks.scopes, roleSlug: cloudAuthUserLinks.roleSlug })
        .from(cloudAuthUserLinks)
        .where(eq(cloudAuthUserLinks.userId, userId))
        .limit(1)
      return link?.scopes ?? scopesForOperatorRole(link?.roleSlug) ?? FULL_ACCESS_SCOPES
    }

    const [profile] = await db
      .select({
        permissions: userProfilesTable.permissions,
        isSuperAdmin: userProfilesTable.isSuperAdmin,
      })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, userId))
      .limit(1)
    const stored = profile?.permissions
    if (stored && !stored.includes("*")) return stored
    const roleScopes =
      scopesForOperatorRole(profile?.isSuperAdmin ? "owner" : "admin") ?? FULL_ACCESS_SCOPES
    return stored ? [...new Set([...stored, ...roleScopes])].sort() : roleScopes
  }

  async function resolveAuthRequest(
    request: Request,
    env: Env,
  ): Promise<VoyantRequestAuthContext | null> {
    const { db, dispose } = openDatabase(env)
    try {
      const auth = buildBetterAuth(env, db)
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session) {
        return null
      }

      if (isVoyantCloudAuthMode(env)) {
        const revalidateConfig = getCloudAuthRevalidateConfig(env)
        if (!revalidateConfig) {
          return null
        }

        try {
          const revalidation = await revalidateVoyantCloudAdminAuthSession({
            db: db as Parameters<typeof revalidateVoyantCloudAdminAuthSession>[0]["db"],
            sessionId: session.session.id,
            config: revalidateConfig,
          })

          if (!revalidation.ok) {
            return null
          }
        } catch (error) {
          console.error("[auth/session] Cloud revalidation failed:", error)
          return null
        }
      }

      return {
        userId: session.user.id,
        sessionId: session.session.id,
        organizationId: null,
        callerType: "session",
        actor: "staff",
        // Member RBAC scope set (RFC voyant#2085). Defaults to full access until
        // an admin assigns permissions, so existing deployments are unchanged.
        // `actor: "staff"` is retained, so actor-gated paths (incl. the
        // bookings-pii reveal, which short-circuits on staff) are unaffected.
        scopes: await resolveMemberScopes(db, env, session.user.id),
        email: session.user.email ?? null,
      }
    } finally {
      // No `executionCtx` reachable here (called from middleware that
      // doesn't pass one through). Await inline so the WebSocket closes
      // before this fn returns.
      await dispose()
    }
  }

  /**
   * Single-tenant: every authenticated session is a staff user with full access.
   * When `resolveAuthRequest` has already granted a session, permissions are
   * implicitly allowed. If you need granular RBAC later, switch on
   * `user_profiles.isSuperAdmin` / `isSupportUser` here.
   */
  async function hasAuthPermission(request: Request, env: Env): Promise<boolean> {
    const auth = await resolveAuthRequest(request, env)
    return auth !== null
  }

  class CurrentUserNotFoundError extends Error {
    constructor() {
      super("User not found")
      this.name = "CurrentUserNotFoundError"
    }
  }

  async function getCurrentUserForRequest(
    request: Request,
    env: Env,
  ): Promise<OperatorCurrentUser | null> {
    if (shouldUseBrowserEvidenceAuthFallback(env, request)) {
      return null
    }

    const { db, dispose } = openDatabase(env)
    try {
      const betterAuth = buildBetterAuth(env, db)
      const session = await betterAuth.api.getSession({ headers: request.headers })
      if (!session) {
        return null
      }

      const [row] = await db
        .select({
          id: authUser.id,
          email: authUser.email,
          createdAt: authUser.createdAt,
          firstName: userProfilesTable.firstName,
          lastName: userProfilesTable.lastName,
          locale: userProfilesTable.locale,
          timezone: userProfilesTable.timezone,
          uiPrefs: userProfilesTable.uiPrefs,
          avatarUrl: userProfilesTable.avatarUrl,
          isSuperAdmin: userProfilesTable.isSuperAdmin,
          isSupportUser: userProfilesTable.isSupportUser,
        })
        .from(authUser)
        .leftJoin(userProfilesTable, eq(userProfilesTable.id, authUser.id))
        .where(eq(authUser.id, session.user.id))
        .limit(1)

      if (!row) {
        throw new CurrentUserNotFoundError()
      }

      return {
        id: row.id,
        email: row.email ?? session.user.email ?? "",
        firstName: row.firstName ?? null,
        lastName: row.lastName ?? null,
        locale: row.locale ?? "en",
        timezone: row.timezone ?? null,
        uiPrefs: row.uiPrefs ?? null,
        isSuperAdmin: row.isSuperAdmin ?? false,
        isSupportUser: row.isSupportUser ?? false,
        createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
        profilePictureUrl: row.avatarUrl ?? null,
      }
    } finally {
      await dispose()
    }
  }

  async function getBootstrapStatusForRequest(
    request: Request,
    env: Env,
  ): Promise<OperatorAuthBootstrapStatus> {
    if (shouldUseBrowserEvidenceAuthFallback(env, request)) {
      return { hasUsers: true }
    }

    if (isVoyantCloudAuthMode(env)) {
      return { hasUsers: true, authMode: "voyant-cloud" }
    }

    const { db, dispose } = openDatabase(env)
    try {
      const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(authUser)
      return { hasUsers: (row?.count ?? 0) > 0, authMode: "local" }
    } finally {
      await dispose()
    }
  }

  async function validateApiTokenAccess(
    env: Env,
    db: VoyantDb,
    apiKey: SelectApikey,
  ): Promise<boolean> {
    if (!isVoyantCloudAuthMode(env)) return true

    const revalidateConfig = getCloudAuthRevalidateConfig(env)
    if (!revalidateConfig) return false

    try {
      const revalidation = await revalidateVoyantCloudAdminAuthUser({
        db: db as Parameters<typeof revalidateVoyantCloudAdminAuthUser>[0]["db"],
        userId: apiKey.referenceId,
        config: revalidateConfig,
      })
      return revalidation.ok
    } catch (error) {
      console.error("[auth/api-token] Cloud revalidation failed:", error)
      return false
    }
  }

  /**
   * GET /auth/me
   * Returns the current authenticated user's profile.
   * Validates the session cookie directly (no Bearer token needed).
   */
  auth.get("/auth/me", async (c) => {
    try {
      const currentUser = await getCurrentUserForRequest(c.req.raw, c.env)
      if (!currentUser) {
        return c.json({ error: "Unauthorized" }, 401)
      }
      return c.json(currentUser)
    } catch (error) {
      if (error instanceof CurrentUserNotFoundError) {
        return c.json({ error: "User not found" }, 404)
      }
      throw error
    }
  })

  /**
   * GET /auth/status
   * Ensures the authenticated user has a user_profiles row.
   * Profile is normally created by the BA databaseHook on sign-up,
   * but this route serves as an idempotent fallback.
   */
  auth.get("/auth/status", async (c) => {
    // See `/auth/me` above — auth sub-app runs before the request `db`
    // middleware, so own the Pool here.
    const { db, dispose } = openDatabase(c.env)
    try {
      const betterAuth = buildBetterAuth(c.env, db)
      const session = await betterAuth.api.getSession({ headers: c.req.raw.headers })
      if (!session) {
        return c.json({ userExists: false, authenticated: false })
      }

      const userId = session.user.id

      const status = await ensureCurrentUserProfile(
        db as Parameters<typeof ensureCurrentUserProfile>[0],
        userId,
      )
      if (!status.userExists && status.authenticated) {
        console.error("[auth/status] Error:", status.reason)
        return c.json(status, 500)
      }

      return c.json(status)
    } finally {
      c.executionCtx.waitUntil(dispose())
    }
  })

  /**
   * GET /auth/bootstrap-status
   * Public endpoint — reveals whether any user exists. Used by the sign-in /
   * sign-up route loaders to pick the right flow.
   */
  auth.get("/auth/bootstrap-status", async (c) => {
    return c.json(await getBootstrapStatusForRequest(c.req.raw, c.env))
  })

  async function handleApiTokensFacade(c: Context<AuthHonoEnv>) {
    const { db, dispose } = openDatabase(c.env)
    try {
      const betterAuth = buildBetterAuth(c.env, db)
      const cloudAuthDb = db as Parameters<typeof revalidateVoyantCloudAdminAuthSession>[0]["db"]

      if (isVoyantCloudAuthMode(c.env)) {
        const revalidateConfig = getCloudAuthRevalidateConfig(c.env)
        if (!revalidateConfig) {
          return c.json(
            { error: "Cloud-mode API token management requires membership revalidation" },
            501,
          )
        }

        const session = await betterAuth.api.getSession({ headers: c.req.raw.headers })
        if (!session) {
          return c.json({ error: "Unauthorized" }, 401)
        }

        try {
          const revalidation = await revalidateVoyantCloudAdminAuthSession({
            db: cloudAuthDb,
            sessionId: session.session.id,
            config: revalidateConfig,
          })

          if (!revalidation.ok) {
            return c.json({ error: "Voyant Cloud access revoked" }, 403)
          }
        } catch (error) {
          console.error("[auth/api-tokens] Cloud revalidation failed:", error)
          return c.json({ error: "Voyant Cloud access could not be revalidated" }, 503)
        }
      }

      return (
        (await handleApiTokenManagementRequest(c.req.raw, betterAuth, {
          db,
          accessCatalog: runtimeOptions.accessCatalog,
        })) ?? c.json({ error: "Not found" }, 404)
      )
    } finally {
      c.executionCtx.waitUntil(dispose())
    }
  }

  async function handleOrganizationMembersFacade(c: Context<AuthHonoEnv>) {
    const { db, dispose } = openDatabase(c.env)
    try {
      const betterAuth = buildBetterAuth(c.env, db)
      const cloudAuthDb = db as Parameters<typeof revalidateVoyantCloudAdminAuthSession>[0]["db"]

      if (isVoyantCloudAuthMode(c.env)) {
        const revalidateConfig = getCloudAuthRevalidateConfig(c.env)
        if (!revalidateConfig) {
          return c.json(
            { error: "Cloud-mode organization member lookup requires membership revalidation" },
            501,
          )
        }

        const session = await betterAuth.api.getSession({ headers: c.req.raw.headers })
        if (!session) {
          return c.json({ error: "Unauthorized" }, 401)
        }

        try {
          const revalidation = await revalidateVoyantCloudAdminAuthSession({
            db: cloudAuthDb,
            sessionId: session.session.id,
            config: revalidateConfig,
          })

          if (!revalidation.ok) {
            return c.json({ error: "Voyant Cloud access revoked" }, 403)
          }
        } catch (error) {
          console.error("[auth/organization-members] Cloud revalidation failed:", error)
          return c.json({ error: "Voyant Cloud access could not be revalidated" }, 503)
        }
      }

      const organizationMembersDb = db as Parameters<
        typeof handleOrganizationMembersRequest
      >[2]["db"]
      return (
        (await handleOrganizationMembersRequest(c.req.raw, betterAuth, {
          db: organizationMembersDb,
        })) ?? c.json({ error: "Not found" }, 404)
      )
    } finally {
      c.executionCtx.waitUntil(dispose())
    }
  }

  auth.get("/auth/cloud/start", async (c) => {
    if (!isVoyantCloudAuthMode(c.env)) {
      return c.json({ error: "Not found" }, 404)
    }

    const config = getCloudAuthStartConfig(c.env)
    if (!config) {
      return cloudAuthNotConfiguredResponse(c)
    }

    try {
      const start = await createCloudAdminAuthStart({
        requestUrl: c.req.url,
        next: c.req.query("next"),
        config,
      })
      return new Response(null, {
        status: 302,
        headers: {
          Location: start.redirectUrl,
          "Set-Cookie": start.setCookie,
        },
      })
    } catch (error) {
      console.error("[auth/cloud/start] Error:", error)
      return c.json({ error: "Voyant Cloud auth broker is misconfigured" }, 500)
    }
  })

  auth.get("/auth/cloud/callback", async (c) => {
    if (!isVoyantCloudAuthMode(c.env)) {
      return c.json({ error: "Not found" }, 404)
    }

    const exchangeConfig = getCloudAuthExchangeConfig(c.env)
    if (!exchangeConfig) {
      const url = new URL(c.req.url)
      return c.json({ error: "Voyant Cloud auth exchange is not configured yet" }, 501, {
        "Set-Cookie": buildClearCloudAdminAuthStateCookie(
          url.protocol === "https:",
          url.pathname.replace(/\/callback$/, "") || "/auth/cloud",
        ),
      })
    }

    const { db, dispose } = openDatabase(c.env)
    try {
      const betterAuth = buildBetterAuth(c.env, db)
      return await betterAuth.handler(c.req.raw)
    } catch (error) {
      console.error("[auth/cloud/callback] Error:", error)
      return c.json({ error: "Voyant Cloud auth callback failed" }, 500)
    } finally {
      c.executionCtx.waitUntil(dispose())
    }
  })

  auth.all("/auth/api-tokens", handleApiTokensFacade)
  auth.all("/auth/api-tokens/:keyId", handleApiTokensFacade)
  auth.all("/auth/api-tokens/:keyId/rotate", handleApiTokensFacade)
  auth.get("/auth/organization/list-members", handleOrganizationMembersFacade)

  auth.get("/auth/customer/status", async (c) => {
    const { db, dispose } = openDatabase(c.env)
    try {
      const betterAuth = buildBetterAuth(c.env, db, { customerSignup: true })
      const session = await betterAuth.api.getSession({ headers: c.req.raw.headers })
      return c.json({ authenticated: Boolean(session) })
    } finally {
      c.executionCtx.waitUntil(dispose())
    }
  })

  auth.all("/auth/customer/*", async (c) => {
    if (
      isVoyantCloudAuthMode(c.env) &&
      !isCloudAllowedBetterAuthRoute(rewriteCustomerAuthRequest(c.req.raw))
    ) {
      return localAuthDisabledResponse(c)
    }

    const { db, dispose } = openDatabase(c.env)
    try {
      const betterAuth = buildBetterAuth(c.env, db, { customerSignup: true })
      return await betterAuth.handler(rewriteCustomerAuthRequest(c.req.raw))
    } finally {
      c.executionCtx.waitUntil(dispose())
    }
  })

  /**
   * Catch-all: delegate to Better Auth handler.
   * Handles sign-in, sign-up, sign-out, password reset, OAuth callbacks, etc.
   *
   * Sign-up is gated by a `user.create.before` hook in @voyant-travel/auth — once a
   * user exists, the hook throws and BA returns an error to the client.
   */
  auth.all("/auth/*", async (c) => {
    if (isVoyantCloudAuthMode(c.env) && !isCloudAllowedBetterAuthRoute(c.req.raw)) {
      return localAuthDisabledResponse(c)
    }

    const { db, dispose } = openDatabase(c.env)
    try {
      const betterAuth = buildBetterAuth(c.env, db)
      return await betterAuth.handler(c.req.raw)
    } finally {
      c.executionCtx.waitUntil(dispose())
    }
  })

  return {
    handler: auth,
    getBootstrapStatusForRequest,
    getCurrentUserForRequest,
    hasAuthPermission,
    resolveAuthRequest,
    validateApiTokenAccess,
  }
}

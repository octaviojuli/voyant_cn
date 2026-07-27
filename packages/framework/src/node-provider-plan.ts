export type VoyantNodeObjectStorageProvider = "memory" | "filesystem" | "s3-compatible" | "custom"
export type VoyantNodeKvProvider = "memory" | "postgres" | "redis"

export interface VoyantNodeProviderPlan {
  storage: VoyantNodeObjectStorageProvider
  cache: VoyantNodeKvProvider
  sharedState: VoyantNodeKvProvider
  rateLimit: VoyantNodeKvProvider
}

const KV_PROVIDER_ROLES = ["cache", "sharedState", "rateLimit"] as const

export function resolveVoyantNodeProviderPlan(
  providers: Readonly<Record<string, string>>,
): VoyantNodeProviderPlan {
  return {
    storage: objectStorageProvider(providers, "storage"),
    cache: kvProvider(providers, "cache"),
    sharedState: kvProvider(providers, "sharedState"),
    rateLimit: kvProvider(providers, "rateLimit"),
  }
}

export function validateVoyantNodeProviderPlanEnv(
  plan: VoyantNodeProviderPlan,
  env: Record<string, unknown>,
): string[] {
  const required = new Set<string>()
  let requiresPostgresUrl = false
  if (plan.storage === "s3-compatible") {
    required.add("S3_REGION")
    required.add("STORAGE_MEDIA_BUCKET")
    required.add("STORAGE_DOCUMENTS_BUCKET")
  }
  // Surface a missing storage root here, where the message names the env var,
  // rather than letting provider construction fail later with a bare throw.
  if (plan.storage === "filesystem") required.add("STORAGE_FILESYSTEM_ROOT")

  for (const role of KV_PROVIDER_ROLES) {
    if (plan[role] === "redis") required.add("REDIS_URL")
    if (plan[role] === "postgres") requiresPostgresUrl = true
  }

  const issues = Array.from(required)
    .filter((name) => !present(env[name]))
    .map((name) => `env ${name} is required by the Node provider plan`)
  if (requiresPostgresUrl && !present(env.DATABASE_URL) && !present(env.DATABASE_URL_DIRECT)) {
    issues.push("env DATABASE_URL or DATABASE_URL_DIRECT is required by the Node provider plan")
  }
  return issues
}

function objectStorageProvider(
  providers: Readonly<Record<string, string>>,
  role: "storage",
): VoyantNodeObjectStorageProvider {
  const provider = requireProvider(providers, role)
  if (provider === "none" || provider === "memory") return "memory"
  if (provider === "filesystem" || provider === "s3-compatible" || provider === "custom") {
    return provider
  }
  throw new Error(
    `deployment graph providers.${role}=${provider} is not supported by the Node runtime`,
  )
}

function kvProvider(
  providers: Readonly<Record<string, string>>,
  role: (typeof KV_PROVIDER_ROLES)[number],
): VoyantNodeKvProvider {
  const provider = requireProvider(providers, role)
  if (provider === "none" || provider === "memory") return "memory"
  if (provider === "redis" || provider === "postgres") return provider
  throw new Error(
    `deployment graph providers.${role}=${provider} is not supported by the Node runtime`,
  )
}

function requireProvider(providers: Readonly<Record<string, string>>, role: string): string {
  const provider = providers[role]
  if (typeof provider === "string" && provider.length > 0) return provider
  throw new Error(`deployment graph providers.${role} must be a non-empty string`)
}

function present(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined
}

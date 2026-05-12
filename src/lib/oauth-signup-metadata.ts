/** Legacy key — cleared alongside the new key */
export const OAUTH_SIGNUP_MARKETING_STORAGE_KEY_LEGACY = "homelens_oauth_signup_marketing_opt_in"

/** sessionStorage + localStorage: name + marketing from signup when user continues with Google */
export const OAUTH_SIGNUP_METADATA_STORAGE_KEY = "homelens_oauth_signup_metadata"

export type PendingOAuthSignupMetadata = {
  full_name: string
  marketing_opt_in: boolean
}

/** Parsed pending signup fields for Google OAuth (same keys as email signUp user_metadata). */
export type PendingOAuthSignupPayload = {
  full_name?: string
  marketing_opt_in: boolean
}

export function clearPendingOAuthSignupMetadata(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(OAUTH_SIGNUP_METADATA_STORAGE_KEY)
  localStorage.removeItem(OAUTH_SIGNUP_METADATA_STORAGE_KEY)
  sessionStorage.removeItem(OAUTH_SIGNUP_MARKETING_STORAGE_KEY_LEGACY)
}

/**
 * Read pending name + marketing from sessionStorage / localStorage (and legacy marketing-only key).
 * Call again after auth session is ready — does not consume / clear storage.
 */
export function readPendingOAuthSignupPayload(): PendingOAuthSignupPayload | null {
  if (typeof window === "undefined") return null

  const metaRaw =
    sessionStorage.getItem(OAUTH_SIGNUP_METADATA_STORAGE_KEY) ??
    localStorage.getItem(OAUTH_SIGNUP_METADATA_STORAGE_KEY)
  const legacyRaw =
    metaRaw === null
      ? sessionStorage.getItem(OAUTH_SIGNUP_MARKETING_STORAGE_KEY_LEGACY)
      : null

  if (metaRaw !== null) {
    try {
      const parsed = JSON.parse(metaRaw) as PendingOAuthSignupMetadata
      if (
        typeof parsed.marketing_opt_in === "boolean" &&
        typeof parsed.full_name === "string"
      ) {
        const trimmed = parsed.full_name.trim()
        return {
          marketing_opt_in: parsed.marketing_opt_in,
          ...(trimmed ? { full_name: trimmed } : {}),
        }
      }
      clearPendingOAuthSignupMetadata()
      return null
    } catch {
      clearPendingOAuthSignupMetadata()
      return null
    }
  }

  if (legacyRaw !== null) {
    try {
      const marketingOptIn = JSON.parse(legacyRaw) as boolean
      if (typeof marketingOptIn === "boolean") {
        return { marketing_opt_in: marketingOptIn }
      }
    } catch {
      sessionStorage.removeItem(OAUTH_SIGNUP_MARKETING_STORAGE_KEY_LEGACY)
    }
  }

  return null
}

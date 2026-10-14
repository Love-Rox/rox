/**
 * Registration Policy
 *
 * Single source of truth for whether new local accounts may be created, shared by
 * password sign-up (`/api/auth/register`) and OAuth sign-up.
 *
 * @module lib/registrationPolicy
 */

import type { InstanceSettingsService } from "../services/InstanceSettingsService.js";

/**
 * Subset of InstanceSettingsService needed to evaluate the registration policy.
 */
export type RegistrationSettingsSource = Pick<
  InstanceSettingsService,
  "isRegistrationEnabled" | "isInviteOnly"
>;

/**
 * Effective registration policy for the instance.
 */
export interface RegistrationPolicy {
  /** Whether new accounts may be created at all */
  registrationEnabled: boolean;
  /** Whether new accounts require an invitation code */
  inviteOnly: boolean;
}

/**
 * Check if registration requires an invitation code.
 *
 * Uses the DB setting first, falling back to the `REQUIRE_INVITATION` env var.
 *
 * @param settings - Instance settings source
 * @returns True if invite-only mode is active
 */
export async function isInviteOnly(settings: RegistrationSettingsSource): Promise<boolean> {
  if (await settings.isInviteOnly()) return true;

  // Fall back to environment variable for backwards compatibility
  const requireInvitation = process.env.REQUIRE_INVITATION;
  return requireInvitation === "true" || requireInvitation === "1";
}

/**
 * Check if registration is enabled.
 *
 * Uses the DB setting first; if it is false, `ENABLE_REGISTRATION=false|0`
 * keeps it disabled.
 *
 * @param settings - Instance settings source
 * @returns True if registration is enabled
 */
export async function isRegistrationEnabled(
  settings: RegistrationSettingsSource,
): Promise<boolean> {
  const dbSetting = await settings.isRegistrationEnabled();

  if (!dbSetting) {
    const envSetting = process.env.ENABLE_REGISTRATION;
    if (envSetting === "false" || envSetting === "0") return false;
  }

  return dbSetting;
}

/**
 * Resolve the full registration policy.
 *
 * @param settings - Instance settings source
 * @returns Effective registration policy
 */
export async function getRegistrationPolicy(
  settings: RegistrationSettingsSource,
): Promise<RegistrationPolicy> {
  const [registrationEnabled, inviteOnly] = await Promise.all([
    isRegistrationEnabled(settings),
    isInviteOnly(settings),
  ]);
  return { registrationEnabled, inviteOnly };
}

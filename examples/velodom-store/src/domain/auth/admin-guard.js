/**
 * ----------------------------------------
 * Module: Administration Navigation Guard
 * ----------------------------------------
 *
 * Keeps unauthorized users out of the admin UI as a usability measure. The
 * backend fixture independently repeats role and tenant authorization.
 * ----------------------------------------
 */

import { getStoreSession } from "../backend/store-api-client.js";

/** Allows the north-tenant admin fixture account or redirects to sign-in. */
export async function requireAdminPage({ to }) {
  const returnTo = normalizeReturnPath(to?.path);

  try {
    const session = await getStoreSession();
    const roles = Array.isArray(session?.roles) ? session.roles : [];

    if (
      session?.authenticated === true
      && roles.includes("admin")
      && session.user?.tenantId === "north"
    ) {
      return true;
    }

    return createSignInPath(returnTo, "admin");
  } catch {
    return createSignInPath(returnTo, "unavailable");
  }
}

function createSignInPath(returnTo, reason) {
  const query = new URLSearchParams({ returnTo, reason });

  return `/sign-in?${query.toString()}`;
}

function normalizeReturnPath(path) {
  const value = String(path || "/admin/products").trim();

  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/admin/products";
}

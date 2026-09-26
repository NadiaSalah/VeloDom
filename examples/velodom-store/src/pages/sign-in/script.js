/**
 * ----------------------------------------
 * Module: Store Session Fixture Behavior
 * ----------------------------------------
 *
 * Exercises the replaceable HTTP session contract without turning local demo
 * identities into framework auth policy.
 * ----------------------------------------
 */

import {
  getStoreSession
} from "#app/domain/backend/store-api-client.js";

export const state = {
  session: null,
  sessionLoading: true,
  sessionError: "",
  actionResult: null,
  actionResultLoading: false,
  actionResultError: "",
  actionMessage: "",
  returnTo: "/"
};

export async function init({ state, ctx }) {
  state.returnTo = normalizeReturnPath(ctx.query?.returnTo);

  const refresh = async () => {
    state.sessionLoading = true;
    state.sessionError = "";

    try {
      state.session = await getStoreSession();
    } catch (error) {
      state.sessionError = error?.message || "The server session could not be read.";
    } finally {
      state.sessionLoading = false;
    }
  };

  state.handleLoginSuccess = ({ result }) => {
    state.session = result;
    state.actionMessage = "The fixture account changed. Continue to exercise server authorization.";
  };
  state.handleLogoutSuccess = ({ result }) => {
    state.session = result;
    state.actionMessage = "The server session ended.";
  };
  state.handleExpireSuccess = async () => {
    await refresh();
    state.actionMessage = "The server expired the session; the next private request will require sign-in.";
  };

  await refresh();
}

function normalizeReturnPath(value) {
  const path = String(Array.isArray(value) ? value[0] : value || "/").trim();

  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/__fixture-api")
    ? path
    : "/";
}

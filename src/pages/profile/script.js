import {
  VD_AUTH
} from "velodom";

export function init({ state, ctx }) {
  state.routeTitle = ctx.meta.title || "Profile";
  state.sessionPreview = "No demo session";
  state.authResult = null;
  state.authLoading = false;
  state.authError = "";

  const refresh = () => {
    state.sessionPreview = (
      window.localStorage.getItem(VD_AUTH.STORAGE_KEY)
      || "No demo session"
    );
  };

  state.setEditor = () => {
    window.localStorage.setItem(
      VD_AUTH.STORAGE_KEY,
      JSON.stringify({
        authenticated: true,
        token: "editor-demo-token",
        roles: ["editor"]
      })
    );
    refresh();
  };

  state.setAdmin = () => {
    window.localStorage.setItem(
      VD_AUTH.STORAGE_KEY,
      JSON.stringify({
        authenticated: true,
        token: "admin-demo-token",
        roles: ["admin"]
      })
    );
    refresh();
  };

  state.clearSession = () => {
    window.localStorage.removeItem(VD_AUTH.STORAGE_KEY);
    refresh();
  };

  refresh();
}

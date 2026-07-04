import {
  VD_AUTH,
  VD_REQUEST
} from "velodom";

export function init({ state, ctx }) {
  state.requestLogs ??= [];
  state.demoResult ??= [];
  state.demoLoading ??= false;
  state.demoError ??= "";
  state.sessionPreview ??= "No session stored";

  const pushLog = (line) => {
    state.requestLogs = [line, ...state.requestLogs]
      .slice(0, 12);
  };

  const updateSessionPreview = () => {
    const raw = window.localStorage.getItem(VD_AUTH.STORAGE_KEY);

    state.sessionPreview = raw || "No session stored";
  };

  ctx?.on?.(VD_REQUEST.EVENTS.ERROR, (payload) => {
    pushLog(`[error] ${payload?.route || "-"} | ${payload?.stage || "request"} | ${payload?.message || payload?.error?.message || "Unknown error"}`);
  });

  ctx?.on?.(VD_REQUEST.EVENTS.SUCCESS, (payload) => {
    const params = JSON.stringify(payload?.params || {});
    pushLog(`[success] ${payload?.route || "-"} | params=${params}`);
  });

  ctx?.on?.("demo:broken-listener", () => {
    throw new Error("Intentional demo listener crash");
  });

  state.clearLogs = () => {
    state.requestLogs = [];
    state.demoError = "";
  };

  state.refreshSessionState = () => {
    updateSessionPreview();
  };

  state.setViewerSession = () => {
    window.localStorage.setItem(VD_AUTH.STORAGE_KEY, JSON.stringify({
      token: "viewer-token",
      roles: ["viewer"]
    }));
    updateSessionPreview();
  };

  state.setEditorSession = () => {
    window.localStorage.setItem(VD_AUTH.STORAGE_KEY, JSON.stringify({
      token: "editor-token",
      roles: ["editor"]
    }));
    updateSessionPreview();
  };

  state.setAdminSession = () => {
    window.localStorage.setItem(VD_AUTH.STORAGE_KEY, JSON.stringify({
      token: "admin-token",
      roles: ["admin"]
    }));
    updateSessionPreview();
  };

  state.setBrokenSession = () => {
    window.localStorage.setItem(VD_AUTH.STORAGE_KEY, "{broken json");
    updateSessionPreview();
  };

  state.clearSession = () => {
    window.localStorage.removeItem(VD_AUTH.STORAGE_KEY);
    updateSessionPreview();
  };

  state.emitBrokenEvent = () => {
    state.emit("demo:broken-listener", {
      at: Date.now()
    });
  };

  updateSessionPreview();
}

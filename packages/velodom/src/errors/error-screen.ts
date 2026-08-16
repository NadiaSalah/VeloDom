/**
 * ----------------------------------------
 * Module: Fatal Error Screen
 * ----------------------------------------
 *
 * Replaces a crashed application with one safe, text-only diagnostic screen
 * and suppresses duplicate fatal render attempts.
 * ----------------------------------------
 */

let fatalScreenShown = false;

/** Options controlling the fatal diagnostic title and details. */
export interface FatalErrorScreenOptions {
  title?: string;
  details?: string;
}

/** Renders the first fatal framework failure as escaped text. */
export function renderFatalFrameworkError(
  error: unknown,
  options: FatalErrorScreenOptions = {}
) {
  if (fatalScreenShown) return;

  fatalScreenShown = true;

  const title = options.title || "Framework Error";
  const details = options.details || sanitizeErrorMessage(error);

  document.documentElement.style.background = "#0b1220";

  Object.assign(document.body.style, {
    margin: "0",
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background:
      "radial-gradient(circle at 20% 10%, #243b66 0%, #0b1220 45%, #070b14 100%)",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
  });

  const card = document.createElement("section");

  Object.assign(card.style, {
    width: "min(720px, 92vw)",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(9, 15, 28, 0.82)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
    backdropFilter: "blur(4px)",
    color: "#e6ecff",
    padding: "28px 26px"
  });

  const badge = document.createElement("div");
  badge.textContent = "VeloDom Runtime";

  Object.assign(badge.style, {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "rgba(255, 93, 93, 0.16)",
    color: "#ff9f9f",
    fontSize: "12px",
    letterSpacing: "0.4px",
    fontWeight: "700",
    textTransform: "uppercase"
  });

  const heading = document.createElement("h1");
  heading.textContent = title;

  Object.assign(heading.style, {
    margin: "14px 0 10px",
    fontSize: "28px",
    lineHeight: "1.2",
    letterSpacing: "-0.02em"
  });

  const message = document.createElement("p");
  message.textContent = details;

  Object.assign(message.style, {
    margin: "0",
    color: "#c5d0f8",
    lineHeight: "1.65",
    fontSize: "15px",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere"
  });

  card.append(badge, heading, message);
  document.body.replaceChildren(card);
}

function sanitizeErrorMessage(error: unknown) {
  const record = asErrorRecord(error);
  const value =
    record?.message
    || asErrorRecord(record?.reason)?.message
    || record?.reason
    || "Unexpected framework failure occurred.";

  return String(value).slice(0, 800);
}

function asErrorRecord(
  value: unknown
): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? value as Record<string, unknown>
    : null;
}

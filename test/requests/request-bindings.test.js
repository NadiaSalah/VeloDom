import assert from "node:assert/strict";
import test from "node:test";
import {
  VD,
  VD_REQUEST
} from "../../packages/velodom/src/constants.ts";
import {
  createAutoStatusBinding,
  resolveRequestBinding,
  validateRequestBindingAccess
} from "../../packages/velodom/src/requests/request-bindings.ts";

function createContext(pageStates = {}) {
  return {
    page: "features",
    hasPage: name => Object.hasOwn(pageStates, name),
    getPageState: name => pageStates[name]
  };
}

test("request bindings resolve local and cross-page state", () => {
  const current = {
    __vdPageName: "features"
  };
  const home = {
    __vdPageName: "home",
    $allowExternalWrite: ["externalResult"]
  };
  const context = createContext({
    home
  });

  const local = resolveRequestBinding(
    "",
    "",
    "postResult",
    current,
    context,
    VD.TARGET
  );
  const external = resolveRequestBinding(
    "home",
    "",
    "externalResult",
    current,
    context,
    VD.TARGET
  );

  assert.equal(local.state, current);
  assert.equal(local.path, "postResult");
  assert.equal(external.state, home);
  assert.equal(external.path, "externalResult");
  assert.equal(
    validateRequestBindingAccess(external, current, context),
    true
  );
});

test("automatic request status names replace the Result suffix", () => {
  const target = {
    state: {},
    path: "postResult",
    pageName: "features"
  };

  assert.equal(
    createAutoStatusBinding(target, "loading").path,
    "postLoading"
  );
  assert.equal(
    createAutoStatusBinding(target, "error").path,
    "postError"
  );
});

test("automatic request status suffix names are frozen", () => {
  assert.deepEqual(VD_REQUEST.STATUS_SUFFIXES, {
    RESULT: "Result",
    LOADING: "Loading",
    ERROR: "Error"
  });
});

test("automatic request status names append suffixes without Result", () => {
  const target = {
    state: {},
    path: "post",
    pageName: "features"
  };

  assert.equal(
    createAutoStatusBinding(target, "loading").path,
    "postLoading"
  );
  assert.equal(
    createAutoStatusBinding(target, "error").path,
    "postError"
  );
});

test("automatic request status names preserve nested state paths", () => {
  const target = {
    state: {},
    path: "article.currentResult",
    pageName: "features"
  };

  assert.equal(
    createAutoStatusBinding(target, "loading").path,
    "article.currentLoading"
  );
  assert.equal(
    createAutoStatusBinding(target, "error").path,
    "article.currentError"
  );
});

test("protected request targets report a configuration problem", () => {
  const problems = [];
  const current = {
    __vdPageName: "features"
  };
  const context = createContext();
  const binding = {
    state: current,
    path: "components.modal",
    pageName: "features"
  };

  const result = validateRequestBindingAccess(
    binding,
    current,
    context,
    {
      report(_state, _el, _route, error) {
        problems.push(String(error));
        return null;
      }
    }
  );

  assert.equal(result, null);
  assert.match(problems[0], /protected state key "components"/i);
});

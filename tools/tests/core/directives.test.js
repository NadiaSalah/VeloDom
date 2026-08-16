import assert from "node:assert/strict";
import test from "node:test";
import { VD } from "../../../packages/velodom/src/constants.ts";
import { applyDirectives } from "../../../packages/velodom/src/directives.ts";
import { createState } from "../../../packages/velodom/src/reactive.ts";

class FakeElement {
  constructor(attributes = {}) {
    this.attributeMap = new Map(Object.entries(attributes));
    this.parentElement = null;
    this.nextElementSibling = null;
    this.style = {};
  }

  get attributes() {
    return [...this.attributeMap].map(([name, value]) => ({
      name,
      value
    }));
  }

  matches(selector) {
    return selector
      .split(",")
      .map(part => part.trim().match(/^\[([^\]]+)\]$/)?.[1])
      .filter(Boolean)
      .some(name => this.hasAttribute(name));
  }

  querySelectorAll() {
    return [];
  }

  closest(selector) {
    return this.matches(selector) ? this : null;
  }

  hasAttribute(name) {
    return this.attributeMap.has(name);
  }

  getAttribute(name) {
    return this.attributeMap.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributeMap.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributeMap.delete(name);
  }
}

test("bindings wait until their conditional element becomes active", async () => {
  const element = new FakeElement({
    [VD.IF]: "Boolean(externalPostResult?.id)",
    [VD.HREF]: "'/blog/posts/' + externalPostResult.id"
  });
  const state = createState({
    externalPostResult: null
  });
  const cleanup = await applyDirectives(element, state);

  assert.equal(element.style.display, "none");
  assert.equal(element.hasAttribute("href"), false);

  state.externalPostResult = {
    id: 7
  };

  assert.equal(element.style.display, "");
  assert.equal(element.getAttribute("href"), "/blog/posts/7");

  cleanup();
});

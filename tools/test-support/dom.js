import { Window } from "happy-dom";

const DOM_GLOBALS = [
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "Node",
  "Element",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLFormElement",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "CustomEvent",
  "FormData",
  "getComputedStyle"
];

export function installDom(url = "http://velodom.test/") {
  const window = new Window({
    url
  });
  const previous = new Map();

  DOM_GLOBALS.forEach(name => {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));

    const value = name === "window"
      ? window
      : name === "getComputedStyle"
        ? window.getComputedStyle.bind(window)
        : window[name];

    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value
    });
  });

  return () => {
    window.close();

    DOM_GLOBALS.forEach(name => {
      const descriptor = previous.get(name);

      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete globalThis[name];
      }
    });
  };
}

export async function waitFor(assertion, {
  attempts = 20
} = {}) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return assertion();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  throw lastError;
}

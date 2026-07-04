import {
  VD,
  VD_EVENT_KEY_MODIFIERS,
  VD_PROTECTED_STATE_KEYS
} from "./constants.js";
import { reportUserActionError } from "./errors/error-reporter.js";
import { applyRequests } from "./requests/request-router.js";

const invalidConditionalPlacementReported = new WeakSet();
const invalidConditionalTypeReported = new WeakSet();

export function applyDirectives(root, state, options = {}) {

  const cleanups = [];
  const context = {
    props: options.props ?? {},
    root: options.el ?? root,
    page: options.page ?? "",
    getPageState: options.getPageState ?? null,
    hasPage: options.hasPage ?? null
  };

  applyText(root, state, cleanups, context);
  applyIf(root, state, cleanups, context);
  applyShow(root, state, cleanups, context);
  applyBindings(root, state, cleanups, context);
  applyModel(root, state, cleanups);
  applyEvents(root, state, cleanups, context);
  applyRequests(root, state, cleanups, context, {
    findAll,
    isInsideForTemplate,
    evaluate,
    writeValue
  });
  applyFor(root, state, cleanups, context);

  return () => {
    cleanups.forEach(cleanup => cleanup());
  };
}

function applyShow(root, state, cleanups, context) {

  findAll(root, VD.SHOW)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      const expression = el.getAttribute(VD.SHOW);

      const update = () => {
        const visible = Boolean(
          evaluate(expression, state, null, el, context.props, {
            directive: VD.SHOW
          })
        );

        // `show` hides visually but keeps the element and layout slot alive.
        el.style.visibility = visible ? "" : "hidden";
        el.style.pointerEvents = visible ? "" : "none";
      };

      update();
      cleanups.push(state._subscribe(update));

    });
}

function applyText(root, state, cleanups, context) {

  findAll(root, VD.TEXT)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      const expression = el.getAttribute(VD.TEXT);

      const update = () => {
        el.textContent = evaluate(expression, state, null, el, context.props, {
          directive: VD.TEXT
        }) ?? "";
      };

      update();
      cleanups.push(state._subscribe(update));

    });
}

function applyIf(root, state, cleanups, context) {

  const conditionals = findConditionalElements(root);
  const processed = new Set();

  conditionals.forEach(el => {

    if (processed.has(el)) return;
    if (isInsideForTemplate(el)) return;

    const chain = getConditionalChain(el);

    chain.forEach(node => processed.add(node));

    if (!el.hasAttribute(VD.IF)) {
      reportInvalidConditionalPlacement(el);
      el.style.display = "none";
      return;
    }

    const update = () => {
      let matched = false;

      chain.forEach(node => {
        const visible = shouldShowConditionalNode(
          node,
          state,
          context.props,
          matched
        );

        node.style.display = visible ? "" : "none";

        if (visible) {
          matched = true;
        }
      });
    };

    update();
    cleanups.push(state._subscribe(update));

  });
}

function applyBindings(root, state, cleanups, context) {

  applyAttributeBinding(root, state, cleanups, context, VD.SRC, "src");
  applyAttributeBinding(root, state, cleanups, context, VD.HREF, "href");
  applyAttributeBinding(root, state, cleanups, context, VD.ALT, "alt");
  applyValueBinding(root, state, cleanups, context);
  applyBooleanBinding(root, state, cleanups, context, VD.DISABLED, "disabled");
  applyBooleanBinding(root, state, cleanups, context, VD.CHECKED, "checked");
  applyClassBinding(root, state, cleanups, context);
  applyStyleBinding(root, state, cleanups, context);
  applyAttrBinding(root, state, cleanups, context);
}

function applyAttributeBinding(root, state, cleanups, context, directive, attrName) {

  findAll(root, directive)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      const expression = el.getAttribute(directive);

      const update = () => {
        const value = evaluate(expression, state, null, el, context.props, {
          directive
        });

        if (value === null || value === undefined || value === false) {
          el.removeAttribute(attrName);
          return;
        }

        el.setAttribute(attrName, value);
      };

      update();
      cleanups.push(state._subscribe(update));

    });
}

function applyValueBinding(root, state, cleanups, context) {

  findAll(root, VD.VALUE)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      const expression = el.getAttribute(VD.VALUE);

      const update = () => {
        const value = evaluate(expression, state, null, el, context.props, {
          directive: VD.VALUE
        });

        el.value = value ?? "";
        el.setAttribute("value", value ?? "");
      };

      update();
      cleanups.push(state._subscribe(update));

    });
}

function applyBooleanBinding(root, state, cleanups, context, directive, attrName) {

  findAll(root, directive)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      const expression = el.getAttribute(directive);

      const update = () => {
        const value = Boolean(evaluate(expression, state, null, el, context.props, {
          directive
        }));

        el[attrName] = value;

        if (value) {
          el.setAttribute(attrName, "");
        } else {
          el.removeAttribute(attrName);
        }
      };

      update();
      cleanups.push(state._subscribe(update));

    });
}

function applyClassBinding(root, state, cleanups, context) {

  findAll(root, VD.CLASS)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      const expression = el.getAttribute(VD.CLASS);
      let applied = new Set();

      const update = () => {
        applied.forEach(name => el.classList.remove(name));

        const next = normalizeClassValue(
          evaluate(expression, state, null, el, context.props, {
            directive: VD.CLASS
          })
        );

        next.forEach(name => el.classList.add(name));
        applied = next;
      };

      update();
      cleanups.push(state._subscribe(update));

    });
}

function applyStyleBinding(root, state, cleanups, context) {

  findAll(root, VD.STYLE)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      const expression = el.getAttribute(VD.STYLE);
      let appliedKeys = [];

      const update = () => {
        const value = evaluate(expression, state, null, el, context.props, {
          directive: VD.STYLE
        });

        if (typeof value === "string") {
          el.style.cssText = value;
          appliedKeys = [];
          return;
        }

        if (!value || typeof value !== "object") {
          el.removeAttribute("style");
          appliedKeys = [];
          return;
        }

        appliedKeys.forEach(key => {
          if (!(key in value)) {
            el.style[toStyleProperty(key)] = "";
          }
        });

        Object.entries(value).forEach(([key, styleValue]) => {
          el.style[toStyleProperty(key)] = styleValue ?? "";
        });

        appliedKeys = Object.keys(value);
      };

      update();
      cleanups.push(state._subscribe(update));

    });
}

function applyAttrBinding(root, state, cleanups, context) {

  findAll(root, VD.ATTR)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      const expression = el.getAttribute(VD.ATTR);
      let appliedKeys = [];

      const update = () => {
        const value = evaluate(expression, state, null, el, context.props, {
          directive: VD.ATTR
        });

        if (!value || typeof value !== "object") {
          appliedKeys.forEach(key => el.removeAttribute(key));
          appliedKeys = [];
          return;
        }

        appliedKeys.forEach(key => {
          if (!(key in value)) {
            el.removeAttribute(key);
          }
        });

        Object.entries(value).forEach(([key, attrValue]) => {
          setAttributeValue(el, key, attrValue);
        });

        appliedKeys = Object.keys(value);
      };

      update();
      cleanups.push(state._subscribe(update));

    });
}

function applyModel(root, state, cleanups) {

  findAll(root, VD.MODEL)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      const key = el.getAttribute(VD.MODEL);

      if (!key?.trim()) {
        reportUserActionError("Missing model path", {
          title: "Invalid data-vd-model",
          directive: VD.MODEL,
          file: "src/core/directives.js",
          line: 319,
          el,
          hint: "Set data-vd-model to a state path like user.name"
        });

        return;
      }

      setInputValue(el, readValue(key, state));

      const onInput = () => {
        writeValue(key, state, getInputValue(el));
      };

      el.addEventListener("input", onInput);
      cleanups.push(() => el.removeEventListener("input", onInput));

      const update = () => {
        const value = readValue(key, state);

        if (getInputValue(el) !== value) {
          setInputValue(el, value);
        }
      };

      cleanups.push(state._subscribe(update));

    });
}

function applyEvents(root, state, cleanups, context) {

  findEventElements(root)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      [...el.attributes].forEach(attr => {

        const config = parseEventDirective(attr.name);

        if (!config) return;

        const expression = attr.value;
        let removed = false;

        const removeHandler = () => {
          if (removed) return;

          removed = true;
          el.removeEventListener(config.eventName, handler);
        };

        const handler = (event) => {
          if (!shouldRunEventHandler(config.modifiers, event)) return;

          if (config.modifiers.has("once")) {
            removeHandler();
          }

          if (config.modifiers.has("prevent")) {
            event.preventDefault();
          }

          if (config.modifiers.has("stop")) {
            event.stopPropagation();
          }

          Promise.resolve(evaluate(expression, state, event, el, context.props, {
            directive: `${VD.ON}-${config.eventName}`
          }))
            .catch(err => {
              reportUserActionError(err, {
                title: "Event Handler Error",
                directive: `${VD.ON}-${config.eventName}`,
                expression,
                file: "src/core/directives.js",
                line: 381,
                el,
                hint: "Check the handler expression and referenced state/functions."
              });
            });
        };

        el.addEventListener(config.eventName, handler);

        cleanups.push(removeHandler);

      });

    });
}

function applyFor(root, state, cleanups, context) {

  findAll(root, VD.FOR)
    .forEach(el => {

      if (el.parentElement?.closest(VD.selector(VD.FOR))) return;

      const expression = el.getAttribute(VD.FOR);
      const config = parseFor(expression);

      if (!config) {
        reportUserActionError(`Invalid ${VD.FOR} expression`, {
          title: "Invalid Loop Expression",
          directive: VD.FOR,
          expression,
          file: "src/core/directives.js",
          line: 404,
          el,
          hint: "Use: item in items OR (item, index) in items"
        });

        return;
      }

      const marker = document.createComment(`vd-for: ${expression}`);
      const template = el.cloneNode(true);
      let rendered = [];

      template.removeAttribute(VD.FOR);
      el.replaceWith(marker);

      const update = () => {
        rendered.forEach(item => {
          item.cleanup();
          item.node.remove();
        });

        rendered = [];

        const items = evaluate(config.source, state, null, el, context.props, {
          directive: VD.FOR
        }) ?? [];

        if (!isIterable(items)) {
          reportUserActionError("Loop source is not iterable", {
            title: "Invalid Loop Source",
            directive: VD.FOR,
            expression: config.source,
            file: "src/core/directives.js",
            line: 424,
            el,
            hint: "Return an array or iterable value from the loop expression."
          });

          return;
        }

        let cursor = marker;

        [...items].forEach((item, index) => {
          const clone = template.cloneNode(true);
          const scoped = createScope(state, {
            [config.item]: item,
            [config.index]: index,
            $index: index
          });

          const cleanup = applyDirectives(clone, scoped, context);

          cursor.after(clone);
          cursor = clone;
          rendered.push({ node: clone, cleanup });
        });
      };

      update();
      cleanups.push(state._subscribe(update));

    });
}

function findAll(root, name) {
  const selector = VD.selector(name);
  const nodes = [];

  if (root.matches?.(selector)) {
    nodes.push(root);
  }

  nodes.push(...root.querySelectorAll(selector));

  return nodes;
}

function findEventElements(root) {
  const nodes = [];

  if (hasEventDirective(root)) {
    nodes.push(root);
  }

  root.querySelectorAll?.("*")
    .forEach(el => {
      if (hasEventDirective(el)) {
        nodes.push(el);
      }
    });

  return nodes;
}

function findConditionalElements(root) {
  const nodes = [];
  const selector = [
    VD.selector(VD.IF),
    VD.selector(VD.ELSEIF),
    VD.selector(VD.ELSE)
  ].join(", ");

  if (root.matches?.(selector)) {
    nodes.push(root);
  }

  nodes.push(...root.querySelectorAll(selector));

  return nodes;
}

function getConditionalChain(start) {
  const chain = [start];
  let current = start.nextElementSibling;

  while (current && isConditionalFollowup(current)) {
    chain.push(current);

    if (current.hasAttribute(VD.ELSE)) {
      break;
    }

    current = current.nextElementSibling;
  }

  return chain;
}

function isConditionalFollowup(el) {
  return (
    el.hasAttribute(VD.ELSEIF) ||
    el.hasAttribute(VD.ELSE)
  );
}

function shouldShowConditionalNode(node, state, props, alreadyMatched) {
  if (node.hasAttribute(VD.ELSE)) {
    return !alreadyMatched;
  }

  if (alreadyMatched) {
    return false;
  }

  const expression = node.getAttribute(VD.IF)
    ?? node.getAttribute(VD.ELSEIF);
  const directive = node.hasAttribute(VD.IF) ? VD.IF : VD.ELSEIF;
  const value = evaluate(expression, state, null, node, props, {
    directive
  });

  if (typeof value !== "boolean") {
    reportInvalidConditionalType(node, expression, directive, value);
    return false;
  }

  return value;
}

function hasEventDirective(el) {
  return [...(el.attributes ?? [])]
    .some(attr => Boolean(parseEventDirective(attr.name)));
}

function parseEventDirective(attrName) {
  if (!attrName.startsWith(VD.ON)) return "";

  const raw = attrName
    .replace(VD.ON, "")
    .replace(/^-/, "");

  if (!raw) return null;

  const [eventName, ...modifiers] = raw
    .split(".")
    .filter(Boolean);

  if (!eventName) return null;

  return {
    eventName,
    modifiers: new Set(modifiers.map(name => name.toLowerCase()))
  };
}

function shouldRunEventHandler(modifiers, event) {
  const keys = [...modifiers]
    .filter(isKeyModifier);

  if (!keys.length) return true;

  const eventKey = normalizeEventKey(event?.key);

  if (!eventKey) return false;

  return keys.some(key => key === eventKey);
}

function isKeyModifier(name) {
  return VD_EVENT_KEY_MODIFIERS.includes(name);
}

function normalizeEventKey(key) {
  if (!key) return "";

  const lower = key.toLowerCase();

  if (lower === "enter") return "enter";
  if (lower === "tab") return "tab";
  if (lower === "delete" || lower === "backspace") return "delete";
  if (lower === "escape" || lower === "esc") return "esc";
  if (lower === " " || lower === "spacebar" || lower === "space") return "space";
  if (lower === "arrowup" || lower === "up") return "up";
  if (lower === "arrowdown" || lower === "down") return "down";
  if (lower === "arrowleft" || lower === "left") return "left";
  if (lower === "arrowright" || lower === "right") return "right";

  return lower;
}

function toStyleProperty(key) {
  return key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function normalizeClassValue(value) {
  const classes = new Set();

  if (typeof value === "string") {
    addClassNames(classes, value);

    return classes;
  }

  if (Array.isArray(value)) {
    value
      .map(normalizeClassValue)
      .forEach(group => {
        group.forEach(name => classes.add(name));
      });

    return classes;
  }

  if (value && typeof value === "object") {
    Object.entries(value)
      .forEach(([name, enabled]) => {
        if (enabled) {
          addClassNames(classes, name);
        }
      });
  }

  return classes;
}

function addClassNames(classes, value) {
  value
    .split(/\s+/)
    .filter(Boolean)
    .forEach(name => classes.add(name));
}

function setAttributeValue(el, key, value) {
  if (value === null || value === undefined || value === false) {
    el.removeAttribute(key);
    return;
  }

  if (value === true) {
    el.setAttribute(key, "");
    return;
  }

  el.setAttribute(key, value);
}

function isInsideForTemplate(el) {
  return Boolean(el.closest(VD.selector(VD.FOR)));
}

function parseFor(expression) {
  const match = expression.match(
    /^\s*(?:\(\s*([\w$]+)\s*,\s*([\w$]+)\s*\)|([\w$]+))\s+in\s+(.+)\s*$/
  );

  if (!match) return null;

  return {
    item: match[1] || match[3],
    index: match[2] || "$index",
    source: match[4]
  };
}

function createScope(parent, locals) {
  return new Proxy(locals, {
    get(target, key) {
      if (key === "_subscribe") return parent._subscribe;
      if (key === "_notify") return parent._notify;
      if (key in target) return target[key];

      return parent[key];
    },

    set(target, key, value) {
      if (key in target) {
        target[key] = value;
        parent._notify();
        return true;
      }

      parent[key] = value;
      return true;
    },

    has(target, key) {
      return key in target || key in parent;
    }
  });
}

function evaluate(expression, state, event = null, el = null, props = {}, meta = {}) {
  try {
    const fn = new Function(
      "state",
      "event",
      "props",
      "el",
      `with(state){ return (${expression}) }`
    );

    return fn.call(el, state, event, props, el);
  } catch (err) {
    reportUserActionError(err, {
      title: "Expression Evaluation Error",
      directive: meta.directive || "expression",
      expression,
      file: "src/core/directives.js",
      line: 709,
      el,
      hint: "Check expression syntax and make sure referenced variables exist."
    });

    return "";
  }
}

function readValue(path, state) {
  const normalizedPath = resolvePathKeys(path, state);

  if (!normalizedPath) return undefined;

  return normalizedPath
    .split(".")
    .reduce((value, key) => value?.[key], state);
}

function writeValue(path, state, value) {
  const protectedKey = findProtectedStatePathKey(path);

  if (protectedKey) {
    reportUserActionError(`Protected state key "${protectedKey}" cannot be written`, {
      title: "Protected State Path",
      directive: VD.MODEL,
      expression: String(path || ""),
      file: "src/core/directives.js",
      hint: "Use normal application state keys. Prototype and framework-owned keys are reserved."
    });

    return;
  }

  const normalizedPath = resolvePathKeys(path, state);

  if (!normalizedPath) {
    reportUserActionError("Empty state path", {
      title: "Invalid State Path",
      directive: VD.MODEL,
      expression: String(path || ""),
      file: "src/core/directives.js",
      line: 813,
      level: "warn",
      hint: "Provide a valid target path like posts or home.posts."
    });

    return;
  }

  const keys = normalizedPath.split(".");

  if (keys.length === 1) {
    state[keys[0]] = value;
    return;
  }

  const last = keys.pop();
  const target = keys.reduce((current, key) => current?.[key], state);

  if (!target) {
    reportUserActionError("Model path target does not exist", {
      title: "Invalid Model Path",
      directive: VD.MODEL,
      expression: normalizedPath,
      file: "src/core/directives.js",
      line: 743,
      level: "warn",
      hint: "Create the nested object before binding. Example: state.user = {}."
    });

    return;
  }

  target[last] = value;
  state._notify();
}

function getInputValue(el) {
  if (el.type === "checkbox") {
    return el.checked;
  }

  return el.value;
}

function setInputValue(el, value) {
  if (el.type === "checkbox") {
    el.checked = Boolean(value);
    return;
  }

  el.value = value ?? "";
}

function isIterable(value) {
  return Boolean(value && typeof value[Symbol.iterator] === "function");
}

function resolvePathKeys(path, state) {
  const cleaned = String(path || "")
    .trim()
    .replace(/\[(\w+)\]/g, ".$1")
    .replace(/^\.+|\.+$/g, "");

  if (!cleaned) return "";

  const parts = cleaned.split(".").filter(Boolean);

  if (parts.some(key => VD_PROTECTED_STATE_KEYS.includes(key) || key.startsWith("__vd"))) {
    return "";
  }

  if (parts.length <= 1) {
    return parts[0] || "";
  }

  if (parts[0] in state) {
    return parts.join(".");
  }

  return parts.slice(1).join(".");
}

function findProtectedStatePathKey(path) {
  return String(path || "")
    .trim()
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .find(key => VD_PROTECTED_STATE_KEYS.includes(key) || key.startsWith("__vd"))
    || "";
}

function reportInvalidConditionalPlacement(el) {
  if (invalidConditionalPlacementReported.has(el)) return;

  invalidConditionalPlacementReported.add(el);

  const directive = el.hasAttribute(VD.ELSEIF) ? VD.ELSEIF : VD.ELSE;
  const previous = el.previousElementSibling;
  let hint = "Place it directly after an element that has data-vd-if.";

  if (!previous) {
    hint = "This directive needs a previous sibling with data-vd-if.";
  } else if (previous.hasAttribute(VD.ELSE)) {
    hint = "data-vd-elseif cannot appear after data-vd-else.";
  } else if (!(previous.hasAttribute(VD.IF) || previous.hasAttribute(VD.ELSEIF))) {
    hint = "Use data-vd-if first, then optional data-vd-elseif, then optional data-vd-else.";
  }

  reportUserActionError("Conditional directive used without a valid previous if-chain", {
    title: "Invalid Conditional Chain",
    directive,
    file: "src/core/directives.js",
    line: 82,
    el,
    hint
  });
}

function reportInvalidConditionalType(el, expression, directive, value) {
  if (invalidConditionalTypeReported.has(el)) return;

  invalidConditionalTypeReported.add(el);

  reportUserActionError(`Expected boolean but got ${typeof value}`, {
    title: "Invalid If Condition Type",
    directive,
    expression,
    file: "src/core/directives.js",
    line: 602,
    el,
    hint: "Return true/false explicitly. Example: count > 0"
  });
}

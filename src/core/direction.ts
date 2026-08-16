/**
 * ----------------------------------------
 * Module: Direction Plugin
 * ----------------------------------------
 *
 * Provides optional locale and document direction management for multilingual
 * applications without introducing mandatory translation runtime behavior.
 * ----------------------------------------
 */

import { VD_DIRECTION } from "./constants.ts";
import type {
  DirectionController,
  DirectionLocaleDefinition,
  DirectionPluginOptions,
  DirectionValue,
  PluginContext,
  VeloDomPlugin
} from "./types.ts";

type DirectionSubscriber = () => void;

interface DirectionState {
  locale: string;
  lang: string;
  direction: DirectionValue;
}

/** Creates an optional plugin that controls document lang and dir attributes. */
export function createDirectionPlugin(
  options: DirectionPluginOptions = {}
): VeloDomPlugin {
  const locales = normalizeLocales(options.locales);
  const defaultLocale = normalizeDefaultLocale(
    options.defaultLocale,
    locales
  );

  return {
    setup(context: PluginContext) {
      if (context.app.direction) {
        throw new TypeError(
          "VeloDom direction plugin is already registered"
        );
      }

      const previous = readDocumentDirection();
      const controller = createDirectionController(
        locales,
        defaultLocale
      );

      Object.defineProperty(context.app, "direction", {
        configurable: true,
        enumerable: true,
        value: controller
      });
      controller.setLocale(defaultLocale);

      return () => {
        restoreDocumentDirection(previous);
        Reflect.deleteProperty(context.app, "direction");
      };
    }
  };
}

function createDirectionController(
  locales: Record<string, DirectionLocaleDefinition>,
  initialLocale: string
): DirectionController & {
  _subscribe(callback: DirectionSubscriber): () => void;
} {
  const subscribers = new Set<DirectionSubscriber>();
  const state: DirectionState = {
    locale: initialLocale,
    lang: locales[initialLocale].lang,
    direction: locales[initialLocale].direction
  };
  const notify = () => {
    for (const subscriber of subscribers) {
      subscriber();
    }
  };
  const controller = {
    get locale() {
      return state.locale;
    },
    get lang() {
      return state.lang;
    },
    get direction() {
      return state.direction;
    },
    get isRTL() {
      return state.direction === "rtl";
    },
    setLocale(locale: string) {
      const normalized = String(locale || "").trim();
      const definition = locales[normalized];

      if (!definition) {
        throw new TypeError(
          `Unknown VeloDom locale "${normalized || "<empty>"}"`
        );
      }

      state.locale = normalized;
      state.lang = definition.lang;
      state.direction = definition.direction;
      applyDocumentDirection(state);
      notify();
    },
    setDirection(direction: DirectionValue) {
      const normalized = normalizeDirection(direction, "direction");

      state.direction = normalized;
      applyDocumentDirection(state);
      notify();
    },
    _subscribe(callback: DirectionSubscriber) {
      subscribers.add(callback);

      return () => {
        subscribers.delete(callback);
      };
    }
  };

  return controller;
}

function normalizeLocales(
  value: DirectionPluginOptions["locales"]
): Record<string, DirectionLocaleDefinition> {
  const source = value || {
    [VD_DIRECTION.DEFAULT_LOCALE]: {
      lang: VD_DIRECTION.DEFAULT_LANG,
      direction: VD_DIRECTION.DEFAULT_DIRECTION
    }
  };

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("VeloDom direction locales must be an object");
  }

  const entries = Object.entries(source).map(([name, definition]) => {
    const locale = String(name || "").trim();

    if (!locale) {
      throw new TypeError("VeloDom direction locale names cannot be empty");
    }

    if (
      !definition
      || typeof definition !== "object"
      || Array.isArray(definition)
    ) {
      throw new TypeError(
        `VeloDom direction locale "${locale}" must be an object`
      );
    }

    const lang = String(definition.lang || locale).trim();

    if (!lang) {
      throw new TypeError(
        `VeloDom direction locale "${locale}" must define a language`
      );
    }

    return [
      locale,
      {
        lang,
        direction: normalizeDirection(
          definition.direction,
          `locale "${locale}" direction`
        )
      }
    ] as const;
  });

  if (entries.length === 0) {
    throw new TypeError("VeloDom direction locales cannot be empty");
  }

  return Object.fromEntries(entries);
}

function normalizeDefaultLocale(
  value: string | undefined,
  locales: Record<string, DirectionLocaleDefinition>
) {
  const locale = String(
    value || Object.keys(locales)[0] || VD_DIRECTION.DEFAULT_LOCALE
  ).trim();

  if (!Object.hasOwn(locales, locale)) {
    throw new TypeError(
      `Default VeloDom locale "${locale}" is not defined`
    );
  }

  return locale;
}

function normalizeDirection(
  value: unknown,
  label: string
): DirectionValue {
  const direction = String(
    value || VD_DIRECTION.DEFAULT_DIRECTION
  ).trim() as DirectionValue;

  if (!VD_DIRECTION.DIRECTIONS.includes(direction)) {
    throw new TypeError(
      `Invalid VeloDom ${label} "${direction}". Use ltr, rtl, or auto.`
    );
  }

  return direction;
}

function applyDocumentDirection(state: DirectionState) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  root.lang = state.lang;
  root.dir = state.direction;
}

function readDocumentDirection() {
  if (typeof document === "undefined") {
    return {
      lang: "",
      dir: ""
    };
  }

  return {
    lang: document.documentElement.getAttribute("lang") || "",
    dir: document.documentElement.getAttribute("dir") || ""
  };
}

function restoreDocumentDirection(previous: { lang: string; dir: string }) {
  if (typeof document === "undefined") return;

  restoreAttribute(document.documentElement, "lang", previous.lang);
  restoreAttribute(document.documentElement, "dir", previous.dir);
}

function restoreAttribute(
  element: HTMLElement,
  name: string,
  value: string
) {
  if (value) {
    element.setAttribute(name, value);
    return;
  }

  element.removeAttribute(name);
}

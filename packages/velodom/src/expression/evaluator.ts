/**
 * ----------------------------------------
 * Module: Safe Expression Evaluator
 * ----------------------------------------
 *
 * Evaluates parsed template expressions against explicit state, props, event,
 * and element scopes using a small allowlist of safe standard globals.
 * ----------------------------------------
 */

import { VD_EXPRESSION } from "../constants.ts";
import { parseExpression } from "./parser.ts";

const expressionCache = new Map<
  string,
  ReturnType<typeof parseExpression>
>();

const safeGlobals = Object.freeze({
  Array,
  Boolean,
  JSON,
  Math,
  Number,
  Object: Object.freeze({
    entries: Object.entries,
    keys: Object.keys,
    values: Object.values
  }),
  String,
  isFinite: Number.isFinite,
  isNaN: Number.isNaN,
  parseFloat,
  parseInt
});

/** Values explicitly available while evaluating a template expression. */
export interface ExpressionScope {
  state?: Record<string, unknown>;
  event?: unknown;
  props?: Record<string, unknown>;
  el?: unknown;
}

/** Parses, caches, and evaluates a safe expression against a scope. */
export function evaluateExpression(
  source: string,
  scope: ExpressionScope = {}
) {
  let ast = expressionCache.get(source);

  if (!ast) {
    ast = parseExpression(source);
    expressionCache.set(source, ast);
  }

  return evaluateAst(ast, {
    state: scope.state || Object.create(null),
    event: scope.event,
    props: scope.props || Object.create(null),
    el: scope.el
  });
}

/** Evaluates a previously parsed expression AST. */
export function evaluateAst(ast, scope: Required<ExpressionScope>) {
  switch (ast.type) {
    case "Literal":
      return ast.value;

    case "Identifier":
      return resolveIdentifier(ast.name, scope).value;

    case "ArrayExpression":
      return ast.elements.map(element => evaluateAst(element, scope));

    case "ObjectExpression": {
      const object = {};

      ast.properties.forEach(property => {
        assertSafeMember(property.key);
        object[property.key] = evaluateAst(property.value, scope);
      });

      return object;
    }

    case "TemplateLiteral":
      return ast.quasis.reduce((output, quasi, index) => {
        const expression = ast.expressions[index];

        return expression
          ? output + quasi + String(evaluateAst(expression, scope))
          : output + quasi;
      }, "");

    case "UnaryExpression":
      return evaluateUnary(ast, scope);

    case "UpdateExpression":
      return evaluateUpdate(ast, scope);

    case "BinaryExpression":
      return evaluateBinary(
        ast.operator,
        evaluateAst(ast.left, scope),
        evaluateAst(ast.right, scope)
      );

    case "LogicalExpression":
      return evaluateLogical(ast, scope);

    case "ConditionalExpression":
      return evaluateAst(ast.test, scope)
        ? evaluateAst(ast.consequent, scope)
        : evaluateAst(ast.alternate, scope);

    case "MemberExpression":
      return resolveMember(ast, scope).value;

    case "CallExpression":
      return evaluateCall(ast, scope);

    default:
      throw new TypeError(`Unsupported expression node "${ast.type}"`);
  }
}

/** Clears cached expression ASTs, primarily for tests and development tools. */
export function clearExpressionCache() {
  expressionCache.clear();
}

function evaluateUnary(ast, scope) {
  if (ast.operator === "typeof" && ast.argument.type === "Identifier") {
    const reference = resolveIdentifier(ast.argument.name, scope, true);
    return typeof reference.value;
  }

  const value = evaluateAst(ast.argument, scope);

  switch (ast.operator) {
    case "!":
      return !value;
    case "+":
      return +value;
    case "-":
      return -value;
    case "typeof":
      return typeof value;
    default:
      throw new TypeError(`Unsupported unary operator "${ast.operator}"`);
  }
}

function evaluateBinary(operator, left, right) {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
    case "%":
      return left % right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "==":
      return left == right;
    case "!=":
      return left != right;
    case "===":
      return left === right;
    case "!==":
      return left !== right;
    default:
      throw new TypeError(`Unsupported binary operator "${operator}"`);
  }
}

function evaluateUpdate(ast, scope) {
  const reference = resolveWritableStateReference(ast.argument, scope);
  const previous = reference.receiver[reference.key];
  const next = ast.operator === "++"
    ? Number(previous) + 1
    : Number(previous) - 1;

  reference.receiver[reference.key] = next;

  return ast.prefix ? next : previous;
}

function evaluateLogical(ast, scope) {
  const left = evaluateAst(ast.left, scope);

  if (ast.operator === "&&") {
    return left ? evaluateAst(ast.right, scope) : left;
  }

  if (ast.operator === "||") {
    return left ? left : evaluateAst(ast.right, scope);
  }

  if (ast.operator === "??") {
    return left === null || left === undefined
      ? evaluateAst(ast.right, scope)
      : left;
  }

  throw new TypeError(`Unsupported logical operator "${ast.operator}"`);
}

function evaluateCall(ast, scope) {
  const reference = ast.callee.type === "MemberExpression"
    ? resolveMember(ast.callee, scope)
    : ast.callee.type === "Identifier"
      ? resolveIdentifier(ast.callee.name, scope)
      : {
        value: evaluateAst(ast.callee, scope),
        receiver: undefined
      };

  if (
    (reference.value === null || reference.value === undefined)
    && (ast.optional || reference.optional)
  ) {
    return undefined;
  }

  if (typeof reference.value !== "function") {
    throw new TypeError("Expression target is not callable");
  }

  const args = ast.arguments.map(argument => evaluateAst(argument, scope));

  return Reflect.apply(
    reference.value,
    reference.receiver,
    args
  );
}

function resolveMember(ast, scope) {
  const object = evaluateAst(ast.object, scope);

  if (object === null || object === undefined) {
    if (ast.optional) {
      return {
        value: undefined,
        receiver: undefined,
        optional: true
      };
    }

    throw new TypeError("Cannot read a property from null or undefined");
  }

  const key = ast.computed
    ? evaluateAst(ast.property, scope)
    : ast.property.name;
  const normalizedKey = String(key);

  assertSafeMember(normalizedKey);

  return {
    value: object[normalizedKey],
    receiver: object,
    optional: false
  };
}

function resolveIdentifier(name, scope, allowMissing = false) {
  if (VD_EXPRESSION.BLOCKED_IDENTIFIERS.includes(name)) {
    throw new TypeError(`Expression identifier "${name}" is not allowed`);
  }

  if (name === "state") {
    return {
      value: scope.state,
      receiver: scope
    };
  }

  if (name === "event" || name === "props" || name === "el") {
    return {
      value: scope[name],
      receiver: scope
    };
  }

  if (name in scope.state) {
    return {
      value: scope.state[name],
      receiver: scope.state
    };
  }

  if (Object.hasOwn(safeGlobals, name)) {
    return {
      value: safeGlobals[name],
      receiver: undefined
    };
  }

  if (allowMissing) {
    return {
      value: undefined,
      receiver: undefined
    };
  }

  throw new ReferenceError(`${name} is not defined`);
}

function resolveWritableStateReference(ast, scope) {
  if (!isStateExpression(ast, scope)) {
    throw new TypeError(
      "Update expressions may only change application state values"
    );
  }

  if (ast.type === "Identifier") {
    if (ast.name === "state") {
      throw new TypeError("The state object itself cannot be replaced");
    }

    return {
      receiver: scope.state,
      key: ast.name
    };
  }

  const reference = resolveMember(ast, scope);

  if (reference.optional || reference.receiver === undefined) {
    throw new TypeError("Optional state members cannot be updated");
  }

  const key = ast.computed
    ? evaluateAst(ast.property, scope)
    : ast.property.name;

  assertSafeMember(String(key));

  return {
    receiver: reference.receiver,
    key: String(key)
  };
}

function isStateExpression(ast, scope) {
  let root = ast;

  while (root.type === "MemberExpression") {
    root = root.object;
  }

  return root.type === "Identifier" && (
    root.name === "state"
    || (
      root.name !== "event"
      && root.name !== "props"
      && root.name !== "el"
      && root.name in scope.state
    )
  );
}

function assertSafeMember(name) {
  if (
    String(name).startsWith("__vd")
    || VD_EXPRESSION.BLOCKED_MEMBERS.includes(String(name))
  ) {
    throw new TypeError(`Expression member "${name}" is not allowed`);
  }
}

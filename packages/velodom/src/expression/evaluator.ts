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
import {
  parseExpression,
  type ExpressionNode
} from "./parser.ts";

const expressionCache = new Map<string, ExpressionNode>();

const safeGlobals: Readonly<Record<string, unknown>> = Object.freeze({
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

type EvaluationScope = Required<ExpressionScope>;
type UnaryNode = Extract<ExpressionNode, { type: "UnaryExpression" }>;
type UpdateNode = Extract<ExpressionNode, { type: "UpdateExpression" }>;
type LogicalNode = Extract<ExpressionNode, { type: "LogicalExpression" }>;
type CallNode = Extract<ExpressionNode, { type: "CallExpression" }>;
type MemberNode = Extract<ExpressionNode, { type: "MemberExpression" }>;
type WritableNode = Extract<
  ExpressionNode,
  { type: "Identifier" | "MemberExpression" }
>;

interface ResolvedReference {
  value: unknown;
  receiver: unknown;
  optional?: boolean;
}

interface WritableReference {
  receiver: Record<string, unknown>;
  key: string;
}

/** Parses, caches, and evaluates a safe expression against a scope. */
export function evaluateExpression(
  source: string,
  scope: ExpressionScope = {}
): unknown {
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
export function evaluateAst(
  ast: ExpressionNode,
  scope: EvaluationScope
): unknown {
  switch (ast.type) {
    case "Literal":
      return ast.value;

    case "Identifier":
      return resolveIdentifier(ast.name, scope).value;

    case "ArrayExpression":
      return ast.elements.map(element => evaluateAst(element, scope));

    case "ObjectExpression": {
      const object: Record<string, unknown> = {};

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
      throw new TypeError("Unsupported expression node");
  }
}

/** Clears cached expression ASTs, primarily for tests and development tools. */
export function clearExpressionCache() {
  expressionCache.clear();
}

/** Evaluates the unary. */
function evaluateUnary(ast: UnaryNode, scope: EvaluationScope): unknown {
  if (ast.operator === "typeof" && ast.argument.type === "Identifier") {
    const reference = resolveIdentifier(ast.argument.name, scope, true);
    return typeof reference.value;
  }

  const value = evaluateAst(ast.argument, scope);

  switch (ast.operator) {
    case "!":
      return !value;
    case "+":
      return +(value as number);
    case "-":
      return -(value as number);
    case "typeof":
      return typeof value;
    default:
      throw new TypeError(`Unsupported unary operator "${ast.operator}"`);
  }
}

/** Evaluates the binary. */
function evaluateBinary(
  operator: string,
  left: unknown,
  right: unknown
): unknown {
  switch (operator) {
    case "+":
      return (left as number) + (right as number);
    case "-":
      return (left as number) - (right as number);
    case "*":
      return (left as number) * (right as number);
    case "/":
      return (left as number) / (right as number);
    case "%":
      return (left as number) % (right as number);
    case "<":
      return (left as number) < (right as number);
    case "<=":
      return (left as number) <= (right as number);
    case ">":
      return (left as number) > (right as number);
    case ">=":
      return (left as number) >= (right as number);
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

/** Evaluates the update. */
function evaluateUpdate(ast: UpdateNode, scope: EvaluationScope): unknown {
  const reference = resolveWritableStateReference(ast.argument, scope);
  const previous = reference.receiver[reference.key];
  const next = ast.operator === "++"
    ? Number(previous) + 1
    : Number(previous) - 1;

  reference.receiver[reference.key] = next;

  return ast.prefix ? next : previous;
}

/** Evaluates the logical. */
function evaluateLogical(ast: LogicalNode, scope: EvaluationScope): unknown {
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

/** Evaluates the call. */
function evaluateCall(ast: CallNode, scope: EvaluationScope): unknown {
  const reference: ResolvedReference = ast.callee.type === "MemberExpression"
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

/** Resolves the member. */
function resolveMember(
  ast: MemberNode,
  scope: EvaluationScope
): ResolvedReference {
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
    : ast.property.type === "Identifier"
      ? ast.property.name
      : "";
  const normalizedKey = String(key);

  assertSafeMember(normalizedKey);

  return {
    value: Reflect.get(Object(object), normalizedKey),
    receiver: object,
    optional: false
  };
}

/** Resolves the identifier. */
function resolveIdentifier(
  name: string,
  scope: EvaluationScope,
  allowMissing = false
): ResolvedReference {
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

/** Resolves the writable state reference. */
function resolveWritableStateReference(
  ast: WritableNode,
  scope: EvaluationScope
): WritableReference {
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

  if (
    reference.optional
    || !reference.receiver
    || typeof reference.receiver !== "object"
  ) {
    throw new TypeError("Optional state members cannot be updated");
  }

  const key = ast.computed
    ? evaluateAst(ast.property, scope)
    : ast.property.type === "Identifier"
      ? ast.property.name
      : "";

  assertSafeMember(String(key));

  return {
    receiver: reference.receiver as Record<string, unknown>,
    key: String(key)
  };
}

/** Evaluates the `isStateExpression()` condition for the supplied input. */
function isStateExpression(
  ast: WritableNode,
  scope: EvaluationScope
): boolean {
  let root: ExpressionNode = ast;

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

/** Validates the safe member. */
function assertSafeMember(name: string): void {
  if (
    String(name).startsWith("__vd")
    || VD_EXPRESSION.BLOCKED_MEMBERS.includes(String(name))
  ) {
    throw new TypeError(`Expression member "${name}" is not allowed`);
  }
}

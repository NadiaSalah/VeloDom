/**
 * ----------------------------------------
 * Module: Expression Public Entry
 * ----------------------------------------
 *
 * Exposes the supported parser and evaluator surface while keeping internal
 * AST implementation details private to the expression subsystem.
 * ----------------------------------------
 */

/** Public expression evaluation utilities. */
export {
  clearExpressionCache,
  evaluateAst,
  evaluateExpression
} from "./evaluator.ts";

/** Public expression parsing utilities and syntax error type. */
export {
  ExpressionSyntaxError,
  parseExpression,
  tokenizeExpression
} from "./parser.ts";

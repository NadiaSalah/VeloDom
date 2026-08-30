/**
 * ----------------------------------------
 * Module: Safe Expression Parser
 * ----------------------------------------
 *
 * Tokenizes and parses the intentionally limited template expression grammar
 * without invoking JavaScript evaluation or exposing browser globals.
 * ----------------------------------------
 */

import { VD_EXPRESSION } from "../constants.ts";

const BINARY_PRECEDENCE: Readonly<Record<string, number>> = Object.freeze({
  "??": 1,
  "||": 2,
  "&&": 3,
  "==": 4,
  "!=": 4,
  "===": 4,
  "!==": 4,
  "<": 5,
  "<=": 5,
  ">": 5,
  ">=": 5,
  "+": 6,
  "-": 6,
  "*": 7,
  "/": 7,
  "%": 7
});

const MULTI_CHARACTER_TOKENS = Object.freeze([
  "===",
  "!==",
  "++",
  "--",
  "==",
  "!=",
  ">=",
  "<=",
  "&&",
  "||",
  "??",
  "?."
]);

const SINGLE_CHARACTER_TOKENS = new Set(
  "+-*/%><!?:.,()[]{}".split("")
);

interface TokenBase {
  type: string;
  value: string;
  start: number;
  end: number;
}

interface LiteralToken extends TokenBase {
  type: "number" | "string";
  literal: number | string;
}

interface TemplateExpressionToken {
  source: string;
  start: number;
  end: number;
}

interface TemplateToken extends TokenBase {
  type: "template";
  quasis: string[];
  expressions: TemplateExpressionToken[];
}

interface IdentifierToken extends TokenBase {
  type: "identifier";
}

interface PlainToken extends TokenBase {
  type: "eof" | "punctuator";
}

type ExpressionToken =
  | IdentifierToken
  | LiteralToken
  | PlainToken
  | TemplateToken;

interface ExpressionNodeBase {
  type: string;
  start: number;
  end: number;
  parenthesized?: boolean;
}

interface IdentifierNode extends ExpressionNodeBase {
  type: "Identifier";
  name: string;
}

interface LiteralNode extends ExpressionNodeBase {
  type: "Literal";
  value: unknown;
  raw: string;
}

interface ArrayExpressionNode extends ExpressionNodeBase {
  type: "ArrayExpression";
  elements: ExpressionNode[];
}

interface ObjectPropertyNode extends ExpressionNodeBase {
  type: "Property";
  key: string;
  value: ExpressionNode;
  shorthand: boolean;
}

interface ObjectExpressionNode extends ExpressionNodeBase {
  type: "ObjectExpression";
  properties: ObjectPropertyNode[];
}

interface TemplateLiteralNode extends ExpressionNodeBase {
  type: "TemplateLiteral";
  quasis: string[];
  expressions: ExpressionNode[];
}

interface UnaryExpressionNode extends ExpressionNodeBase {
  type: "UnaryExpression";
  operator: string;
  argument: ExpressionNode;
}

interface UpdateExpressionNode extends ExpressionNodeBase {
  type: "UpdateExpression";
  operator: string;
  argument: IdentifierNode | MemberExpressionNode;
  prefix: boolean;
}

interface BinaryExpressionNode extends ExpressionNodeBase {
  type: "BinaryExpression";
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

interface LogicalExpressionNode extends ExpressionNodeBase {
  type: "LogicalExpression";
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

interface ConditionalExpressionNode extends ExpressionNodeBase {
  type: "ConditionalExpression";
  test: ExpressionNode;
  consequent: ExpressionNode;
  alternate: ExpressionNode;
}

interface MemberExpressionNode extends ExpressionNodeBase {
  type: "MemberExpression";
  object: ExpressionNode;
  property: ExpressionNode;
  computed: boolean;
  optional: boolean;
}

interface CallExpressionNode extends ExpressionNodeBase {
  type: "CallExpression";
  callee: ExpressionNode;
  arguments: ExpressionNode[];
  optional: boolean;
}

/** Internal safe-expression AST union consumed by the runtime evaluator. */
export type ExpressionNode =
  | IdentifierNode
  | LiteralNode
  | ArrayExpressionNode
  | ObjectExpressionNode
  | TemplateLiteralNode
  | UnaryExpressionNode
  | UpdateExpressionNode
  | BinaryExpressionNode
  | LogicalExpressionNode
  | ConditionalExpressionNode
  | MemberExpressionNode
  | CallExpressionNode;

/** Syntax error carrying the precise expression offset and framework code. */
export class ExpressionSyntaxError extends SyntaxError {
  override code: string;
  offset: number;

  constructor(message: string, offset = 0, code = "VD_EXPRESSION_SYNTAX") {
    super(message);
    this.name = "ExpressionSyntaxError";
    this.code = code;
    this.offset = offset;
  }
}

/** Parses one safe template expression into an expression AST. */
export function parseExpression(source: string): ExpressionNode {
  if (typeof source !== "string" || !source.trim()) {
    throw new ExpressionSyntaxError(
      "Expression cannot be empty",
      0,
      "VD_EXPRESSION_EMPTY"
    );
  }

  const parser = new Parser(tokenizeExpression(source), source);
  const ast = parser.parse();

  return ast;
}

/** Tokenizes one template expression for parser and diagnostic tooling. */
export function tokenizeExpression(source: string): ExpressionToken[] {
  const tokens: ExpressionToken[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source.charAt(index);

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === "'" || char === '"') {
      const token = readString(source, index);
      tokens.push(token);
      index = token.end;
      continue;
    }

    if (char === "`") {
      const token = readTemplate(source, index);
      tokens.push(token);
      index = token.end;
      continue;
    }

    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(source.charAt(index + 1)))) {
      const token = readNumber(source, index);
      tokens.push(token);
      index = token.end;
      continue;
    }

    if (/[A-Za-z_$]/.test(char)) {
      const token = readIdentifier(source, index);
      tokens.push(token);
      index = token.end;
      continue;
    }

    const operator = MULTI_CHARACTER_TOKENS.find(candidate => (
      source.startsWith(candidate, index)
    ));

    if (operator) {
      tokens.push({
        type: "punctuator",
        value: operator,
        start: index,
        end: index + operator.length
      });
      index += operator.length;
      continue;
    }

    if (SINGLE_CHARACTER_TOKENS.has(char)) {
      tokens.push({
        type: "punctuator",
        value: char,
        start: index,
        end: index + 1
      });
      index += 1;
      continue;
    }

    throw new ExpressionSyntaxError(
      `Unexpected character "${char}"`,
      index
    );
  }

  tokens.push({
    type: "eof",
    value: "",
    start: source.length,
    end: source.length
  });

  return tokens;
}

class Parser {
  tokens: ExpressionToken[];
  source: string;
  index: number;

  constructor(tokens: ExpressionToken[], source: string) {
    this.tokens = tokens;
    this.source = source;
    this.index = 0;
  }

  parse(): ExpressionNode {
    const expression = this.parseConditional();

    if (!this.is("eof")) {
      this.fail(`Unexpected token "${this.current().value}"`);
    }

    return expression;
  }

  parseConditional(): ExpressionNode {
    const test = this.parseBinary(1);

    if (!this.match("?")) {
      return test;
    }

    const consequent = this.parseConditional();
    this.expect(":");
    const alternate = this.parseConditional();

    return {
      type: "ConditionalExpression",
      test,
      consequent,
      alternate,
      start: test.start,
      end: alternate.end
    };
  }

  parseBinary(minimumPrecedence: number): ExpressionNode {
    let left = this.parseUnary();

    while (true) {
      const operator = this.current().value;
      const precedence = BINARY_PRECEDENCE[operator];

      if (!precedence || precedence < minimumPrecedence) {
        break;
      }

      this.advance();
      const right = this.parseBinary(precedence + 1);
      left = {
        type: operator === "&&" || operator === "||" || operator === "??"
          ? "LogicalExpression"
          : "BinaryExpression",
        operator,
        left,
        right,
        start: left.start,
        end: right.end
      };
    }

    return left;
  }

  parseUnary(): ExpressionNode {
    const token = this.current();

    if (
      token.value === "!"
      || token.value === "+"
      || token.value === "-"
      || token.value === "typeof"
    ) {
      this.advance();
      const argument = this.parseUnary();

      return {
        type: "UnaryExpression",
        operator: token.value,
        argument,
        start: token.start,
        end: argument.end
      };
    }

    return this.parsePostfix(this.parsePrimary());
  }

  parsePostfix(base: ExpressionNode): ExpressionNode {
    let expression = base;

    while (true) {
      if (this.match(".")) {
        const property = this.expectIdentifier();
        expression = createMemberExpression(
          expression,
          createIdentifier(property),
          false,
          false
        );
        continue;
      }

      if (this.match("?.")) {
        if (this.match("[")) {
          const property = this.parseConditional();
          const end = this.expect("]").end;
          expression = {
            ...createMemberExpression(expression, property, true, true),
            end
          };
          continue;
        }

        if (this.isValue("(")) {
          expression = this.parseCall(expression, true);
          continue;
        }

        const property = this.expectIdentifier();
        expression = createMemberExpression(
          expression,
          createIdentifier(property),
          false,
          true
        );
        continue;
      }

      if (this.match("[")) {
        const property = this.parseConditional();
        const end = this.expect("]").end;
        expression = {
          ...createMemberExpression(expression, property, true, false),
          end
        };
        continue;
      }

      if (this.isValue("(")) {
        expression = this.parseCall(expression, false);
        continue;
      }

      if (this.isValue("++") || this.isValue("--")) {
        const operator = this.advance();

        if (
          expression.type !== "Identifier"
          && (expression.type !== "MemberExpression" || expression.optional)
        ) {
          throw new ExpressionSyntaxError(
            `Update target for "${operator.value}" must be a state value`,
            operator.start
          );
        }

        expression = {
          type: "UpdateExpression",
          argument: expression,
          operator: operator.value,
          prefix: false,
          start: expression.start,
          end: operator.end
        };
        continue;
      }

      break;
    }

    return expression;
  }

  parseCall(callee: ExpressionNode, optional: boolean): CallExpressionNode {
    this.expect("(");
    const args: ExpressionNode[] = [];

    while (!this.isValue(")")) {
      args.push(this.parseConditional());

      if (!this.match(",")) break;
      if (this.isValue(")")) break;
    }

    const close = this.expect(")");

    return {
      type: "CallExpression",
      callee,
      arguments: args,
      optional,
      start: callee.start,
      end: close.end
    };
  }

  parsePrimary(): ExpressionNode {
    const token = this.current();

    if (token.type === "number" || token.type === "string") {
      this.advance();

      return {
        type: "Literal",
        value: token.literal,
        raw: this.source.slice(token.start, token.end),
        start: token.start,
        end: token.end
      };
    }

    if (token.type === "identifier") {
      this.advance();

      if (token.value === "true" || token.value === "false") {
        return createLiteral(token.value === "true", token);
      }

      if (token.value === "null") {
        return createLiteral(null, token);
      }

      if (token.value === "undefined") {
        return createLiteral(undefined, token);
      }

      return createIdentifier(token);
    }

    if (token.type === "template") {
      this.advance();
      const expressions = token.expressions.map(expression => {
        try {
          return parseExpression(expression.source);
        } catch (error) {
          if (error instanceof ExpressionSyntaxError) {
            error.offset += expression.start;
          }

          throw error;
        }
      });

      return {
        type: "TemplateLiteral",
        quasis: token.quasis,
        expressions,
        start: token.start,
        end: token.end
      };
    }

    if (this.match("(")) {
      const expression = this.parseConditional();
      const close = this.expect(")");

      return {
        ...expression,
        parenthesized: true,
        end: close.end
      };
    }

    if (this.match("[")) {
      return this.parseArray(token.start);
    }

    if (this.match("{")) {
      return this.parseObject(token.start);
    }

    return this.fail(`Expected an expression but found "${token.value || "end of input"}"`);
  }

  parseArray(start: number): ArrayExpressionNode {
    const elements: ExpressionNode[] = [];

    while (!this.isValue("]")) {
      elements.push(this.parseConditional());

      if (!this.match(",")) break;
      if (this.isValue("]")) break;
    }

    const close = this.expect("]");

    return {
      type: "ArrayExpression",
      elements,
      start,
      end: close.end
    };
  }

  parseObject(start: number): ObjectExpressionNode {
    const properties: ObjectPropertyNode[] = [];

    while (!this.isValue("}")) {
      const keyToken = this.current();

      if (
        keyToken.type !== "identifier"
        && keyToken.type !== "string"
        && keyToken.type !== "number"
      ) {
        this.fail("Object keys must be identifiers, strings, or numbers");
      }

      this.advance();
      const key = keyToken.type === "identifier"
        ? keyToken.value
        : String(keyToken.literal);
      assertSafeStaticMember(key, keyToken.start);
      let value: ExpressionNode;
      let shorthand = false;

      if (this.match(":")) {
        value = this.parseConditional();
      } else if (keyToken.type === "identifier") {
        value = createIdentifier(keyToken);
        shorthand = true;
      } else {
        this.fail("Object literal property requires a value");
      }

      properties.push({
        type: "Property",
        key,
        value,
        shorthand,
        start: keyToken.start,
        end: value.end
      });

      if (!this.match(",")) break;
      if (this.isValue("}")) break;
    }

    const close = this.expect("}");

    return {
      type: "ObjectExpression",
      properties,
      start,
      end: close.end
    };
  }

  expect(value: string): ExpressionToken {
    if (!this.isValue(value)) {
      this.fail(`Expected "${value}" but found "${this.current().value || "end of input"}"`);
    }

    return this.advance();
  }

  expectIdentifier(): IdentifierToken {
    const token = this.current();

    if (token.type !== "identifier") {
      this.fail(`Expected a property name but found "${token.value}"`);
    }

    this.advance();
    return token;
  }

  match(value: string): boolean {
    if (!this.isValue(value)) return false;

    this.advance();
    return true;
  }

  is(type: ExpressionToken["type"]): boolean {
    return this.current().type === type;
  }

  isValue(value: string): boolean {
    return this.current().value === value;
  }

  current(): ExpressionToken {
    return this.tokens[this.index] || {
      type: "eof",
      value: "",
      start: this.source.length,
      end: this.source.length
    };
  }

  advance(): ExpressionToken {
    const token = this.current();
    this.index += 1;
    return token;
  }

  fail(message: string): never {
    throw new ExpressionSyntaxError(message, this.current().start);
  }
}

/** Reads the identifier. */
function readIdentifier(source: string, start: number): IdentifierToken {
  let end = start + 1;

  while (end < source.length && /[\w$]/.test(source.charAt(end))) {
    end += 1;
  }

  return {
    type: "identifier",
    value: source.slice(start, end),
    start,
    end
  };
}

/** Reads the number. */
function readNumber(source: string, start: number): LiteralToken {
  const match = source.slice(start).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);

  if (!match) {
    throw new ExpressionSyntaxError("Invalid number", start);
  }

  const raw = match[0] || "";

  return {
    type: "number",
    value: raw,
    literal: Number(raw),
    start,
    end: start + raw.length
  };
}

/** Reads the string. */
function readString(source: string, start: number): LiteralToken {
  const quote = source.charAt(start);
  let value = "";
  let index = start + 1;

  while (index < source.length) {
    const char = source.charAt(index);

    if (char === quote) {
      return {
        type: "string",
        value,
        literal: value,
        start,
        end: index + 1
      };
    }

    if (char === "\\") {
      const escaped = source.charAt(index + 1);

      if (!escaped) {
        throw new ExpressionSyntaxError("Unterminated string", start);
      }

      const escapes: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        v: "\v",
        0: "\0"
      };

      value += escapes[escaped] ?? escaped;
      index += 2;
      continue;
    }

    value += char;
    index += 1;
  }

  throw new ExpressionSyntaxError("Unterminated string", start);
}

/** Reads the template. */
function readTemplate(source: string, start: number): TemplateToken {
  const quasis: string[] = [];
  const expressions: TemplateExpressionToken[] = [];
  let value = "";
  let index = start + 1;

  while (index < source.length) {
    const char = source.charAt(index);

    if (char === "`") {
      quasis.push(value);

      return {
        type: "template",
        value: source.slice(start, index + 1),
        quasis,
        expressions,
        start,
        end: index + 1
      };
    }

    if (char === "\\") {
      const escaped = source.charAt(index + 1);

      if (!escaped) {
        throw new ExpressionSyntaxError("Unterminated template literal", start);
      }

      const escapes: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t"
      };

      value += escapes[escaped] ?? escaped;
      index += 2;
      continue;
    }

    if (char === "$" && source[index + 1] === "{") {
      quasis.push(value);
      value = "";

      const expression = readTemplateExpression(source, index + 2);
      expressions.push(expression);
      index = expression.end + 1;
      continue;
    }

    value += char;
    index += 1;
  }

  throw new ExpressionSyntaxError("Unterminated template literal", start);
}

/** Reads the template expression. */
function readTemplateExpression(
  source: string,
  start: number
): TemplateExpressionToken {
  let depth = 1;
  let index = start;
  let quote = "";

  while (index < source.length) {
    const char = source.charAt(index);

    if (quote) {
      if (char === "\\") {
        index += 2;
        continue;
      }

      if (char === quote) {
        quote = "";
      }

      index += 1;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      index += 1;
      continue;
    }

    if (char === "`") {
      throw new ExpressionSyntaxError(
        "Nested template literals are not supported",
        index,
        "VD_EXPRESSION_NESTED_TEMPLATE"
      );
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return {
          source: source.slice(start, index),
          start,
          end: index
        };
      }
    }

    index += 1;
  }

  throw new ExpressionSyntaxError(
    "Unterminated template expression",
    start
  );
}

/** Creates the identifier. */
function createIdentifier(token: IdentifierToken): IdentifierNode {
  if (VD_EXPRESSION.BLOCKED_IDENTIFIERS.includes(token.value)) {
    throw new ExpressionSyntaxError(
      `Expression identifier "${token.value}" is not allowed`,
      token.start,
      "VD_EXPRESSION_IDENTIFIER_BLOCKED"
    );
  }

  return {
    type: "Identifier",
    name: token.value,
    start: token.start,
    end: token.end
  };
}

/** Creates the literal. */
function createLiteral(value: unknown, token: TokenBase): LiteralNode {
  return {
    type: "Literal",
    value,
    raw: token.value,
    start: token.start,
    end: token.end
  };
}

/** Creates the member expression. */
function createMemberExpression(
  object: ExpressionNode,
  property: ExpressionNode,
  computed: boolean,
  optional: boolean
): MemberExpressionNode {
  if (!computed) {
    if (property.type !== "Identifier") {
      throw new ExpressionSyntaxError(
        "Static member access requires an identifier",
        property.start
      );
    }

    assertSafeStaticMember(property.name, property.start);
  } else if (property.type === "Literal") {
    assertSafeStaticMember(String(property.value), property.start);
  }

  return {
    type: "MemberExpression",
    object,
    property,
    computed,
    optional,
    start: object.start,
    end: property.end
  };
}

/** Validates the safe static member. */
function assertSafeStaticMember(name: string, offset: number): void {
  if (
    String(name).startsWith("__vd")
    || VD_EXPRESSION.BLOCKED_MEMBERS.includes(String(name))
  ) {
    throw new ExpressionSyntaxError(
      `Expression member "${name}" is not allowed`,
      offset,
      "VD_EXPRESSION_MEMBER_BLOCKED"
    );
  }
}

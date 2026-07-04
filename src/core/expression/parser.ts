import { VD_EXPRESSION } from "../constants.ts";

const BINARY_PRECEDENCE = Object.freeze({
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

export function parseExpression(source: string) {
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

export function tokenizeExpression(source: string) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

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

    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(source[index + 1]))) {
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
  tokens: any[];
  source: string;
  index: number;

  constructor(tokens, source) {
    this.tokens = tokens;
    this.source = source;
    this.index = 0;
  }

  parse() {
    const expression = this.parseConditional();

    if (!this.is("eof")) {
      this.fail(`Unexpected token "${this.current().value}"`);
    }

    return expression;
  }

  parseConditional() {
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

  parseBinary(minimumPrecedence) {
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

  parseUnary() {
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

  parsePostfix(base) {
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

      break;
    }

    return expression;
  }

  parseCall(callee, optional) {
    this.expect("(");
    const args = [];

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

  parsePrimary() {
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

    this.fail(`Expected an expression but found "${token.value || "end of input"}"`);
  }

  parseArray(start) {
    const elements = [];

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

  parseObject(start) {
    const properties = [];

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
      let value;
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

  expect(value) {
    if (!this.isValue(value)) {
      this.fail(`Expected "${value}" but found "${this.current().value || "end of input"}"`);
    }

    return this.advance();
  }

  expectIdentifier() {
    const token = this.current();

    if (token.type !== "identifier") {
      this.fail(`Expected a property name but found "${token.value}"`);
    }

    this.advance();
    return token;
  }

  match(value) {
    if (!this.isValue(value)) return false;

    this.advance();
    return true;
  }

  is(type) {
    return this.current().type === type;
  }

  isValue(value) {
    return this.current().value === value;
  }

  current() {
    return this.tokens[this.index];
  }

  advance() {
    const token = this.current();
    this.index += 1;
    return token;
  }

  fail(message) {
    throw new ExpressionSyntaxError(message, this.current().start);
  }
}

function readIdentifier(source, start) {
  let end = start + 1;

  while (end < source.length && /[\w$]/.test(source[end])) {
    end += 1;
  }

  return {
    type: "identifier",
    value: source.slice(start, end),
    start,
    end
  };
}

function readNumber(source, start) {
  const match = source.slice(start).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);

  if (!match) {
    throw new ExpressionSyntaxError("Invalid number", start);
  }

  const raw = match[0];

  return {
    type: "number",
    value: raw,
    literal: Number(raw),
    start,
    end: start + raw.length
  };
}

function readString(source, start) {
  const quote = source[start];
  let value = "";
  let index = start + 1;

  while (index < source.length) {
    const char = source[index];

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
      const escaped = source[index + 1];

      if (escaped === undefined) {
        throw new ExpressionSyntaxError("Unterminated string", start);
      }

      const escapes = {
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

function readTemplate(source, start) {
  const quasis = [];
  const expressions = [];
  let value = "";
  let index = start + 1;

  while (index < source.length) {
    const char = source[index];

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
      const escaped = source[index + 1];

      if (escaped === undefined) {
        throw new ExpressionSyntaxError("Unterminated template literal", start);
      }

      const escapes = {
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

function readTemplateExpression(source, start) {
  let depth = 1;
  let index = start;
  let quote = "";

  while (index < source.length) {
    const char = source[index];

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

function createIdentifier(token) {
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

function createLiteral(value, token) {
  return {
    type: "Literal",
    value,
    raw: token.value,
    start: token.start,
    end: token.end
  };
}

function createMemberExpression(object, property, computed, optional) {
  if (!computed || property.type === "Literal") {
    const name = computed
      ? property.value
      : property.name;

    assertSafeStaticMember(String(name), property.start);
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

function assertSafeStaticMember(name, offset) {
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

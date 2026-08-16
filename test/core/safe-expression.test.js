import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateExpression,
  ExpressionSyntaxError,
  parseExpression
} from "../../packages/velodom/src/expression/index.ts";

test("safe expressions preserve operator precedence and conditionals", () => {
  const scope = {
    state: {
      count: 2,
      active: true
    }
  };

  assert.equal(evaluateExpression("count + 3 * 2", scope), 8);
  assert.equal(
    evaluateExpression("active && count > 1 ? 'ready' : 'wait'", scope),
    "ready"
  );
});

test("safe expressions create object and array values", () => {
  const value = evaluateExpression(
    "{ params: { id: postId }, tags: ['html', 'compiler'], autoState: true }",
    {
      state: {
        postId: 7
      }
    }
  );

  assert.deepEqual(value, {
    params: {
      id: 7
    },
    tags: [
      "html",
      "compiler"
    ],
    autoState: true
  });
});

test("optional member access and safe global calls work", () => {
  const scope = {
    state: {
      post: null,
      result: [
        {
          title: "VeloDom"
        }
      ]
    }
  };

  assert.equal(
    evaluateExpression("post?.title || 'Waiting'", scope),
    "Waiting"
  );
  assert.equal(
    evaluateExpression("result?.[0]?.title", scope),
    "VeloDom"
  );
  assert.equal(
    evaluateExpression("Array.isArray(result) && Boolean(result.length)", scope),
    true
  );
});

test("method calls retain their receiver", () => {
  assert.equal(
    evaluateExpression("post.body.slice(0, 4)", {
      state: {
        post: {
          body: "compiler"
        }
      }
    }),
    "comp"
  );
});

test("template literals are evaluated from AST nodes", () => {
  assert.equal(
    evaluateExpression("`Post #${post.id}: ${post.title}`", {
      state: {
        post: {
          id: 7,
          title: "Compiler"
        }
      }
    }),
    "Post #7: Compiler"
  );
});

test("unsafe members and unsupported syntax are rejected", () => {
  assert.throws(
    () => evaluateExpression("value.constructor", {
      state: {
        value: {}
      }
    }),
    /not allowed/
  );
  assert.throws(
    () => parseExpression("Function('return 1')()"),
    error => (
      error instanceof ExpressionSyntaxError
      && error.code === "VD_EXPRESSION_IDENTIFIER_BLOCKED"
    )
  );
  assert.throws(
    () => evaluateExpression("value['con' + 'structor']", {
      state: {
        value: {}
      }
    }),
    /not allowed/
  );
  assert.throws(
    () => parseExpression("el.ownerDocument.defaultView.setTimeout('x')"),
    error => (
      error instanceof ExpressionSyntaxError
      && error.code === "VD_EXPRESSION_MEMBER_BLOCKED"
    )
  );
  assert.throws(
    () => parseExpression("items.map(item => item.id)"),
    error => error instanceof ExpressionSyntaxError
  );
  assert.throws(
    () => evaluateExpression("missingValue", {
      state: {}
    }),
    /missingValue is not defined/
  );
});

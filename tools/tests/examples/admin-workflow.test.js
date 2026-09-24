/**
 * ----------------------------------------
 * Module: Administration Workflow Tests
 * ----------------------------------------
 *
 * Proves server-style pagination, validation, optimistic conflicts, recovery,
 * and confirmed bulk actions over the shared storefront catalog repository.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminConflictError,
  AdminValidationError,
  bulkUpdateAdminProducts,
  getAdminProduct,
  listAdminProducts,
  updateAdminProduct
} from "../../../examples/velodom-store/src/domain/admin/admin-service.js";
import {
  getProduct,
  listCatalog
} from "../../../examples/velodom-store/src/domain/catalog/catalog-service.js";
import {
  resetCatalogRepository
} from "../../../examples/velodom-store/src/domain/catalog/catalog-repository.js";

test.beforeEach(() => {
  resetCatalogRepository();
});

test("admin products use backend-style search and pagination", async () => {
  const firstPage = await listAdminProducts({ page: "1" });

  assert.equal(firstPage.items.length, 3);
  assert.equal(firstPage.pagination.total, 8);
  assert.equal(firstPage.pagination.pageCount, 3);
  assert.equal(firstPage.pagination.hasNext, true);

  const search = await listAdminProducts({ q: "workspace" });

  assert.deepEqual(search.items.map(product => product.id).sort(), [
    "aurora-lamp",
    "focus-timer"
  ]);
});

test("admin validation rejects invalid drafts without changing the record", async () => {
  const before = await getAdminProduct({ id: "aurora-lamp" });

  await assert.rejects(
    () => updateAdminProduct({
      id: before.id,
      name: "x",
      summary: "short",
      status: "unknown",
      expectedRevision: before.revision
    }),
    error => {
      assert.equal(error instanceof AdminValidationError, true);
      assert.deepEqual(Object.keys(error.fields).sort(), [
        "name",
        "status",
        "summary"
      ]);
      return true;
    }
  );

  assert.deepEqual(await getAdminProduct({ id: before.id }), before);
});

test("successful admin edits advance revisions and share storefront data", async () => {
  const before = await getAdminProduct({ id: "aurora-lamp" });
  const result = await updateAdminProduct({
    id: before.id,
    name: "Aurora studio lamp",
    summary: before.summary,
    status: before.status,
    expectedRevision: before.revision
  });

  assert.equal(result.product.name, "Aurora studio lamp");
  assert.equal(result.product.revision, before.revision + 1);
  assert.equal((await getProduct({ id: before.id })).name, "Aurora studio lamp");
});

test("failed and conflicting writes preserve the submitted draft for recovery", async () => {
  const before = await getAdminProduct({ id: "focus-timer" });
  const draft = {
    id: before.id,
    name: "Focus studio timer",
    summary: before.summary,
    status: before.status,
    expectedRevision: before.revision
  };

  await assert.rejects(
    () => updateAdminProduct({ ...draft, mode: "error" }),
    /draft is still available/
  );
  assert.equal((await getAdminProduct({ id: before.id })).name, before.name);
  assert.equal(draft.name, "Focus studio timer");

  await assert.rejects(
    () => updateAdminProduct({ ...draft, mode: "conflict" }),
    error => {
      assert.equal(error instanceof AdminConflictError, true);
      assert.equal(error.current.revision, before.revision + 1);
      return true;
    }
  );
  assert.equal(draft.name, "Focus studio timer");

  const current = await getAdminProduct({ id: before.id });
  const recovered = await updateAdminProduct({
    ...draft,
    expectedRevision: current.revision
  });

  assert.equal(recovered.product.name, draft.name);
});

test("bulk actions require confirmation and update the shared public catalog", async () => {
  await assert.rejects(
    () => bulkUpdateAdminProducts({
      ids: ["aurora-lamp"],
      action: "archive",
      confirmed: false
    }),
    /Confirm the bulk action/
  );

  const archived = await bulkUpdateAdminProducts({
    ids: ["aurora-lamp", "focus-timer"],
    action: "archive",
    confirmed: true
  });

  assert.equal(archived.products.length, 2);
  assert.equal(archived.products.every(product => product.status === "archived"), true);
  assert.deepEqual(
    (await listCatalog({ category: "workspace" })).items,
    []
  );

  await bulkUpdateAdminProducts({
    ids: ["aurora-lamp"],
    action: "publish",
    confirmed: true
  });
  assert.equal((await getProduct({ id: "aurora-lamp" })).status, "active");
});

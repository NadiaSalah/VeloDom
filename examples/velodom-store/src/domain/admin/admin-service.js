/**
 * ----------------------------------------
 * Module: Store Administration Service
 * ----------------------------------------
 *
 * Implements deterministic list, detail, edit, and bulk-action behavior over
 * the same catalog repository used by the public storefront. Authorization is
 * added by the separate backend/session contract milestone.
 * ----------------------------------------
 */

import {
  findAdminCatalogRecord,
  listAdminCatalogRecords,
  simulateConcurrentCatalogWrite,
  updateCatalogRecord,
  updateCatalogStatuses
} from "../catalog/catalog-repository.js";

export const ADMIN_PAGE_SIZE = 3;
export const ADMIN_PRODUCT_STATUSES = Object.freeze([
  "active",
  "draft",
  "archived"
]);

/** Error returned when server-owned product validation rejects a write. */
export class AdminValidationError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = "AdminValidationError";
    this.code = "ADMIN_VALIDATION_FAILED";
    this.fields = fields;
  }
}

/** Error returned when an edit is based on a stale record revision. */
export class AdminConflictError extends Error {
  constructor(record) {
    super(
      `This product changed on the server (revision ${record.revision}). `
      + "Your draft was preserved; reload the server version before saving again."
    );
    this.name = "AdminConflictError";
    this.code = "ADMIN_WRITE_CONFLICT";
    this.current = record;
  }
}

/** Lists administration records using backend-style filtering and pagination. */
export async function listAdminProducts(input = {}) {
  await applyAdminFixtureBehavior(input);
  const filters = normalizeAdminFilters(input);
  const query = filters.q.toLocaleLowerCase("en");
  const matched = listAdminCatalogRecords()
    .filter(product => (
      filters.status === "all" || product.status === filters.status
    ))
    .filter(product => {
      const haystack = `${product.id} ${product.name} ${product.categoryLabel}`
        .toLocaleLowerCase("en");

      return !query || haystack.includes(query);
    })
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
  const pageCount = Math.max(1, Math.ceil(matched.length / ADMIN_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const offset = (page - 1) * ADMIN_PAGE_SIZE;

  return {
    items: matched.slice(offset, offset + ADMIN_PAGE_SIZE),
    filters: {
      ...filters,
      page
    },
    pagination: {
      page,
      pageCount,
      pageSize: ADMIN_PAGE_SIZE,
      total: matched.length,
      hasPrevious: page > 1,
      hasNext: page < pageCount
    }
  };
}

/** Resolves one product for the administration detail and edit pages. */
export async function getAdminProduct(input = {}) {
  await applyAdminFixtureBehavior(input);
  const id = readScalar(input.id ?? input.params?.id, "");
  const product = findAdminCatalogRecord(id);

  if (!product) {
    throw new Error(`Admin product "${id || "unknown"}" was not found.`);
  }

  return product;
}

/** Validates and updates one product while enforcing an expected revision. */
export async function updateAdminProduct(input = {}) {
  await applyAdminFixtureBehavior(input);
  const draft = normalizeProductDraft(input);
  const errors = validateProductDraft(draft);

  if (Object.keys(errors).length > 0) {
    throw new AdminValidationError(
      Object.values(errors).join(" "),
      errors
    );
  }

  if (input.mode === "conflict") {
    simulateConcurrentCatalogWrite(draft.id);
  }

  const outcome = updateCatalogRecord(draft.id, {
    name: draft.name,
    summary: draft.summary,
    status: draft.status
  }, draft.expectedRevision);

  if (outcome.kind === "missing") {
    throw new Error(`Product "${draft.id}" is no longer available.`);
  }
  if (outcome.kind === "conflict") {
    throw new AdminConflictError(outcome.record);
  }

  return {
    message: `${outcome.record.name} saved as revision ${outcome.record.revision}.`,
    product: outcome.record
  };
}

/** Applies one confirmed publication action to selected products. */
export async function bulkUpdateAdminProducts(input = {}) {
  await applyAdminFixtureBehavior(input);
  const ids = normalizeIds(input.ids);
  const action = readScalar(input.action, "");
  const confirmed = input.confirmed === true || input.confirmed === "true";
  const nextStatus = action === "publish"
    ? "active"
    : action === "archive"
      ? "archived"
      : "";

  if (!confirmed) {
    throw new AdminValidationError("Confirm the bulk action before it is applied.");
  }
  if (ids.length === 0) {
    throw new AdminValidationError("Select at least one product.");
  }
  if (!nextStatus) {
    throw new AdminValidationError("Choose Publish or Archive.");
  }

  const knownIds = new Set(listAdminCatalogRecords().map(product => product.id));
  const missingIds = ids.filter(id => !knownIds.has(id));

  if (missingIds.length > 0) {
    throw new AdminValidationError(
      `Unknown product selection: ${missingIds.join(", ")}.`
    );
  }

  const products = updateCatalogStatuses(ids, nextStatus);

  return {
    action,
    message: `${products.length} product${products.length === 1 ? "" : "s"} ${
      nextStatus === "active" ? "published" : "archived"
    }.`,
    products
  };
}

function normalizeAdminFilters(input) {
  const status = readScalar(input.status, "all");

  return {
    q: readScalar(input.q, "").slice(0, 80),
    status: ADMIN_PRODUCT_STATUSES.includes(status) ? status : "all",
    page: normalizePositiveInteger(readScalar(input.page, "1"))
  };
}

function normalizeProductDraft(input) {
  return {
    id: readScalar(input.id, ""),
    name: readScalar(input.name, ""),
    summary: readScalar(input.summary, ""),
    status: readScalar(input.status, ""),
    expectedRevision: Number(readScalar(input.expectedRevision, "0"))
  };
}

function validateProductDraft(draft) {
  const errors = {};

  if (!draft.id) errors.id = "A product id is required.";
  if (draft.name.length < 3 || draft.name.length > 80) {
    errors.name = "Name must contain between 3 and 80 characters.";
  }
  if (draft.summary.length < 12 || draft.summary.length > 180) {
    errors.summary = "Summary must contain between 12 and 180 characters.";
  }
  if (!ADMIN_PRODUCT_STATUSES.includes(draft.status)) {
    errors.status = "Choose a supported publication status.";
  }
  if (!Number.isInteger(draft.expectedRevision) || draft.expectedRevision < 1) {
    errors.expectedRevision = "The edit revision is invalid; reload the product.";
  }

  return errors;
}

function normalizeIds(value) {
  const values = Array.isArray(value) ? value : [value];

  return [...new Set(values
    .flatMap(candidate => String(candidate || "").split(","))
    .map(candidate => candidate.trim())
    .filter(Boolean))];
}

function readScalar(value, fallback) {
  const candidate = Array.isArray(value) ? value[0] : value;

  return String(candidate ?? fallback).trim();
}

function normalizePositiveInteger(value) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0 ? number : 1;
}

async function applyAdminFixtureBehavior(input) {
  if (input?.mode === "error") {
    throw new Error(
      "The mock administration write failed. Your draft is still available."
    );
  }

  const delayMs = Number(input?.delayMs || 0);

  if (Number.isFinite(delayMs) && delayMs > 0) {
    await new Promise(resolvePromise => {
      setTimeout(resolvePromise, Math.min(delayMs, 500));
    });
  }
}

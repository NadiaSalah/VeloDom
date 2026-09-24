/**
 * ----------------------------------------
 * Module: Store Catalog Repository
 * ----------------------------------------
 *
 * Owns the mutable in-memory product records shared by the public storefront
 * and administration workflows. It is an application fixture, not a VeloDom
 * persistence or data-grid API.
 * ----------------------------------------
 */

import { products } from "./products.js";

let records = createInitialRecords();

/** Returns public products while excluding records removed from sale. */
export function listPublicCatalogRecords() {
  return records
    .filter(record => record.status === "active")
    .map(cloneRecord);
}

/** Returns every product record for an authorized administration workflow. */
export function listAdminCatalogRecords() {
  return records.map(cloneRecord);
}

/** Resolves one public product that is currently available in the catalog. */
export function findPublicCatalogRecord(id) {
  const record = findRecord(id);

  return record?.status === "active" ? cloneRecord(record) : null;
}

/** Resolves one administration record regardless of publication status. */
export function findAdminCatalogRecord(id) {
  const record = findRecord(id);

  return record ? cloneRecord(record) : null;
}

/**
 * Applies an optimistic-concurrency update.
 *
 * A conflict result carries the latest record without modifying it so the UI
 * can keep the user's draft and offer an explicit reload choice.
 */
export function updateCatalogRecord(id, patch, expectedRevision) {
  const index = findRecordIndex(id);

  if (index < 0) return { kind: "missing", record: null };

  const current = records[index];

  if (current.revision !== expectedRevision) {
    return {
      kind: "conflict",
      record: cloneRecord(current)
    };
  }

  const next = {
    ...current,
    ...patch,
    id: current.id,
    revision: current.revision + 1,
    variants: current.variants
  };

  records[index] = next;
  return {
    kind: "updated",
    record: cloneRecord(next)
  };
}

/** Changes publication status for an explicit set of known product ids. */
export function updateCatalogStatuses(ids, status) {
  const idSet = new Set(ids);
  const updated = [];

  records = records.map(record => {
    if (!idSet.has(record.id)) return record;

    const next = {
      ...record,
      status,
      revision: record.revision + 1
    };

    updated.push(cloneRecord(next));
    return next;
  });

  return updated;
}

/** Advances a record revision to model an external writer in deterministic tests. */
export function simulateConcurrentCatalogWrite(id) {
  const index = findRecordIndex(id);

  if (index < 0) return null;

  records[index] = {
    ...records[index],
    revision: records[index].revision + 1
  };

  return cloneRecord(records[index]);
}

/** Restores deterministic fixture state between tests or demo sessions. */
export function resetCatalogRepository() {
  records = createInitialRecords();
}

function createInitialRecords() {
  return products.map(product => ({
    ...product,
    status: "active",
    revision: 1,
    variants: product.variants.map(variant => ({ ...variant }))
  }));
}

function findRecord(id) {
  return records.find(record => record.id === normalizeId(id)) || null;
}

function findRecordIndex(id) {
  const normalizedId = normalizeId(id);

  return records.findIndex(record => record.id === normalizedId);
}

function normalizeId(id) {
  return String(id || "").trim();
}

function cloneRecord(record) {
  return {
    ...record,
    variants: record.variants.map(variant => ({ ...variant }))
  };
}

import { requestJson } from "../core/index.js";
import { removeEmptyFields, trimStringFields } from "./middleware.js";
import { toPositiveInteger } from "./validation.js";

const baseUrl = "https://dummyjson.com/posts";

export async function getAll({ limit = 20 } = {}, { signal } = {}) {
  const safeLimit = toPositiveInteger(limit, "posts limit");
  const data = await requestJson(`${baseUrl}?limit=${safeLimit}`, {
    signal
  });

  return data.posts ?? [];
}

export async function getTags(params = {}, { signal } = {}) {
  const tags = await requestJson(`${baseUrl}/tag-list`, {
    signal
  });

  return tags ?? [];
}

export async function getOne({ id } = {}, { signal } = {}) {
  const postId = toPositiveInteger(id, "post id");

  return requestJson(`${baseUrl}/${postId}`, {
    signal
  });
}

export async function create(payload = {}, { signal } = {}) {
  const cleanedPayload = cleanPayload(payload);
  const title = String(cleanedPayload.title || "").trim();

  if (!title) {
    throw new Error("posts.create requires a non-empty title");
  }

  return requestJson(`${baseUrl}/add`, {
    method: "POST",
    body: {
      ...cleanedPayload,
      title
    },
    signal
  });
}

export async function update({ id, ...payload } = {}, { signal } = {}) {
  const postId = toPositiveInteger(id, "post id");
  const cleanedPayload = cleanPayload(payload);

  if (Object.keys(cleanedPayload).length === 0) {
    throw new Error("posts.update requires at least one field to update");
  }

  return requestJson(`${baseUrl}/${postId}`, {
    method: "PUT",
    body: cleanedPayload,
    signal
  });
}

export async function remove({ id } = {}, { signal } = {}) {
  const postId = toPositiveInteger(id, "post id");

  return requestJson(`${baseUrl}/${postId}`, {
    method: "DELETE",
    signal
  });
}

function cleanPayload(payload) {
  return removeEmptyFields(
    trimStringFields(payload)
  );
}

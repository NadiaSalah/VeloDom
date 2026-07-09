import { requestJson } from "velodom";
import { removeEmptyFields, trimStringFields } from "./middleware.js";
import { toPositiveInteger } from "./validation.js";

const baseUrl = "https://dummyjson.com/posts";
const commentsUrl = "https://dummyjson.com/comments";

export async function getAll({ limit = 20 } = {}, { signal } = {}) {
  const safeLimit = toPositiveInteger(limit, "posts limit");
  const data = await requestJson(`${baseUrl}?limit=${safeLimit}&select=title,body,tags,reactions,views,userId`, {
    signal
  });

  return data;
}

export async function search({ q = "", limit = 12 } = {}, { signal } = {}) {
  const safeLimit = toPositiveInteger(limit, "posts search limit");
  const query = encodeURIComponent(String(q || "").trim());
  const url = query
    ? `${baseUrl}/search?q=${query}&limit=${safeLimit}`
    : `${baseUrl}?limit=${safeLimit}`;

  return requestJson(url, {
    signal
  });
}

export async function getTags(_params = {}, { signal } = {}) {
  const tags = await requestJson(`${baseUrl}/tag-list`, {
    signal
  });

  return tags ?? [];
}

export async function getByTag({ tag, limit = 12 } = {}, { signal } = {}) {
  const safeLimit = toPositiveInteger(limit, "tag posts limit");
  const safeTag = encodeURIComponent(String(tag || "").trim());

  if (!safeTag) {
    throw new Error("posts.getByTag requires a tag");
  }

  return requestJson(`${baseUrl}/tag/${safeTag}?limit=${safeLimit}`, {
    signal
  });
}

export async function getOne({ id } = {}, { signal } = {}) {
  const postId = toPositiveInteger(id, "post id");

  return requestJson(`${baseUrl}/${postId}`, {
    signal
  });
}

export async function getComments({ id } = {}, { signal } = {}) {
  const postId = toPositiveInteger(id, "post id");

  return requestJson(`${baseUrl}/${postId}/comments`, {
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

export async function addComment(payload = {}, { signal } = {}) {
  const cleanedPayload = cleanPayload(payload);
  const body = String(cleanedPayload.body || "").trim();
  const postId = toPositiveInteger(cleanedPayload.postId, "comment post id");
  const userId = toPositiveInteger(cleanedPayload.userId || 1, "comment user id");

  if (!body) {
    throw new Error("comments.create requires a non-empty body");
  }

  return requestJson(`${commentsUrl}/add`, {
    method: "POST",
    body: {
      body,
      postId,
      userId
    },
    signal
  });
}

function cleanPayload(payload) {
  return removeEmptyFields(
    trimStringFields(payload)
  );
}

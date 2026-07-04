import { requestJson } from "velodom";
import { toPositiveInteger } from "./validation.js";

const baseUrl = "https://dummyjson.com/users";

export async function getAll({ limit = 20 } = {}, { signal } = {}) {
  const safeLimit = toPositiveInteger(limit, "users limit");
  const data = await requestJson(`${baseUrl}?limit=${safeLimit}`, {
    signal
  });

  return data.users ?? [];
}

export async function getOne({ id } = {}, { signal } = {}) {
  const userId = toPositiveInteger(id, "user id");

  return requestJson(`${baseUrl}/${userId}`, {
    signal
  });
}

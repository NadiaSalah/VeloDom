import { requestJson } from "velodom";
import { toPositiveInteger } from "./validation.js";

const baseUrl = "https://dummyjson.com/users";
const authUrl = "https://dummyjson.com/auth/login";

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

export async function login(payload = {}, { signal } = {}) {
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "").trim();

  if (!username || !password) {
    throw new Error("auth.login requires username and password");
  }

  const session = await requestJson(authUrl, {
    method: "POST",
    body: {
      username,
      password,
      expiresInMins: 30
    },
    credentials: "include",
    signal
  });

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("vd-user-session", JSON.stringify({
      authenticated: true,
      token: session.accessToken,
      user: {
        id: session.id,
        username: session.username,
        email: session.email,
        image: session.image,
        roles: [
          "editor"
        ]
      }
    }));
  }

  return session;
}

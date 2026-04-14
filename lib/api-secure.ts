const API_BASE = "";

async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(API_BASE + url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export function apiGet(url: string) {
  return request(url);
}

export function apiPost(url: string, body: unknown) {
  return request(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPut(url: string, body: unknown) {
  return request(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function apiPatch(url: string, body: unknown) {
  return request(url, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function apiDelete(url: string, body?: unknown) {
  return request(url, {
    method: "DELETE",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const API_BASE = "";

/* =========================
   TOKEN
========================= */
function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/* =========================
   BASE REQUEST
========================= */
async function request(
  url: string,
  options: RequestInit = {}
) {
  const token = getToken();

  const res = await fetch(API_BASE + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

/* =========================
   GET
========================= */
export function apiGet(url: string) {
  return request(url);
}

/* =========================
   POST
========================= */
export function apiPost(url: string, body: any) {
  return request(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* =========================
   PUT
========================= */
export function apiPut(url: string, body: any) {
  return request(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/* =========================
   DELETE
========================= */
export function apiDelete(url: string) {
  return request(url, {
    method: "DELETE",
  });
}

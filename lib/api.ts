export async function apiGet(url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("API Error");
  }

  return res.json();
}

export async function apiPost(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("API Error");
  }

  return res.json();
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const API_URL = "http://localhost:3000";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("aibispro_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data?.message) return Array.isArray(data.message) ? data.message.join(", ") : data.message;
  } catch {
    // response body wasn't JSON - fall through to the generic message
  }
  return fallback;
}

export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(await readErrorMessage(res, `GET ${path} failed: ${res.status}`));
  return res.json();
}

export async function apiPost(path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, `POST ${path} failed: ${res.status}`));
  return res.json();
}

export async function apiPatch(path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, `PATCH ${path} failed: ${res.status}`));
  return res.json();
}

export async function apiDelete(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

/** Fetches a binary file (e.g. a generated .xlsx export) and triggers a browser download,
 * since a plain <a href> link can't carry the Authorization header this API requires. */
export async function apiDownload(path: string, suggestedFileName: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(await readErrorMessage(res, `GET ${path} failed: ${res.status}`));
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function apiUpload(path: string, file: File, extraFields?: Record<string, string | number>) {
  const form = new FormData();
  form.append("file", file);
  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      form.append(key, String(value));
    }
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Upload ${path} failed: ${res.status}`);
  }
  return res.json();
}

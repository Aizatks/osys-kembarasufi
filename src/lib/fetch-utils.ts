/**
 * Shared fetch utilities with automatic auth token injection.
 * All API calls should use these instead of raw fetch().
 */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

/**
 * Fetch with automatic Authorization header.
 * Use for GET requests or any request that doesn't send JSON body.
 */
export async function fetchAuth(url: string, options?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

/**
 * Fetch JSON with automatic Authorization + Content-Type headers.
 * Use for POST/PUT/PATCH requests with JSON body.
 */
export async function fetchJsonAuth(url: string, options: RequestInit & { body: string }): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...options, headers });
}

/**
 * Upload file with automatic Authorization header.
 * Do NOT set Content-Type — browser sets multipart/form-data automatically.
 */
export async function fetchUploadAuth(url: string, formData: FormData, method = "POST"): Promise<Response> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { method, headers, body: formData });
}

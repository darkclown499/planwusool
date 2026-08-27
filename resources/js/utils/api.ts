import { csrfHeaders, getCsrfToken, getXsrfToken } from "@/utils/csrf";
export const apiRequest = async (
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  body?: any
): Promise<any> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...csrfHeaders(),
  };
  if (!headers["X-CSRF-TOKEN"]) {
    const t = getCsrfToken();
    if (t) headers["X-CSRF-TOKEN"] = t;
  }
  if (!headers["X-XSRF-TOKEN"]) {
    const x = getXsrfToken();
    if (x) headers["X-XSRF-TOKEN"] = x;
  }
  const options: RequestInit = {
    method,
    headers,
    credentials: "same-origin",
  };
  if (body !== undefined) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: any = new Error(data.message || "Request failed");
    error.data = data;
    error.status = response.status;
    throw error;
  }
  return data;
};
export const apiGet = (url: string) => apiRequest("GET", url);
export const apiPut = (url: string, body?: any) => apiRequest("PUT", url, body);
export const apiPost = (url: string, body?: any) => apiRequest("POST", url, body);
export const apiDelete = (url: string) => apiRequest("DELETE", url);

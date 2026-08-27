/**
 * Centralized CSRF helpers
 */
export function getXsrfToken(): string | null {
  try {
    const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
  } catch {}
  return null;
}
export function getCsrfToken(): string | null {
  try {
    if (typeof window !== "undefined" && (window as any).page?.props?.csrf_token) {
      const t = (window as any).page.props.csrf_token;
      if (typeof t === "string" && t.length > 0) return t;
    }
  } catch {}
  try {
    const meta = document.head.querySelector("meta[name=\"csrf-token\"]");
    if (meta) {
      const c = (meta as HTMLMetaElement).content;
      if (c) return c;
    }
  } catch {}
  return null;
}
export function csrfHeaders(): Record<string,string> {
  const h: Record<string,string> = {};
  const c = getCsrfToken(); if (c) h["X-CSRF-TOKEN"] = c;
  const x = getXsrfToken(); if (x) h["X-XSRF-TOKEN"] = x;
  return h;
}
export function updateAxiosCsrfToken(): void {
  const t = getCsrfToken();
  if (t && typeof window !== "undefined" && (window as any).axios) (window as any).axios.defaults.headers.common["X-CSRF-TOKEN"] = t;
  const x = getXsrfToken();
  if (x && typeof window !== "undefined" && (window as any).axios) (window as any).axios.defaults.headers.common["X-XSRF-TOKEN"] = x;
}

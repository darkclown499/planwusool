const getCsrfToken = (): string | null => {
  const metaToken = document.head.querySelector('meta[name="csrf-token"]');
  if (metaToken) {
    return (metaToken as HTMLMetaElement).content;
  }
  try {
    if (typeof window !== 'undefined' && (window as any).page?.props?.csrf_token) {
      return (window as any).page.props.csrf_token;
    }
  } catch (e) {
    // Ignore
  }
  return null;
};

export const apiRequest = async (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: any
): Promise<any> => {
  const token = getCsrfToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (token) {
    headers['X-CSRF-TOKEN'] = token;
  }

  const options: RequestInit = {
    method,
    headers,
    credentials: 'same-origin',
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: any = new Error(data.message || 'Request failed');
    error.data = data;
    error.status = response.status;
    throw error;
  }
  return data;
};

export const apiGet = (url: string) => apiRequest('GET', url);
export const apiPut = (url: string, body?: any) => apiRequest('PUT', url, body);
export const apiPost = (url: string, body?: any) => apiRequest('POST', url, body);
export const apiDelete = (url: string) => apiRequest('DELETE', url);

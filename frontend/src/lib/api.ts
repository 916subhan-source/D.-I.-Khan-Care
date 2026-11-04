/**
 * API client configuration for D.I. Khan Doctor Appointment System.
 */

const PROD_BACKEND_URL = 'https://d-i-khan-care.vercel.app/api/v1';

export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    try {
      // Clean up any stale localhost or tunnel from localStorage so closing laptop never cuts off backend
      localStorage.removeItem('cf_tunnel_url');
      const urlParams = new URLSearchParams(window.location.search);
      const queryTunnel = urlParams.get('dev_tunnel') || urlParams.get('cf_tunnel');
      if (queryTunnel && queryTunnel.trim().length > 0) {
        let clean = queryTunnel.trim().replace(/\/+$/, '');
        if (!clean.endsWith('/api/v1')) clean += '/api/v1';
        return clean;
      }
    } catch { }
    return PROD_BACKEND_URL;
  }
  return PROD_BACKEND_URL;
};

export const API_BASE = getApiBase();

// ── Scalability: In-Memory SWR Cache & In-Flight Request Deduplication ──
interface CacheEntry<T = any> {
  data: T;
  expiry: number;
}
const apiCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    apiCache.clear();
  } else {
    for (const key of apiCache.keys()) {
      if (key.includes(pattern)) {
        apiCache.delete(key);
      }
    }
  }
}



// Generic API fetcher with token support
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  // If no explicit Authorization header provided (or empty), derive token based on endpoint context
  if (!headers['Authorization'] || headers['Authorization'].trim() === 'Bearer' || headers['Authorization'].includes('undefined') || headers['Authorization'].includes('null')) {
    let token: string | null = null;
    const isAssistantPath = typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/assistant') ||
      window.location.search.includes('tab=assistant') ||
      window.location.hash.includes('assistant')
    );
    const isDoctorPath = typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/doctor') ||
      window.location.search.includes('tab=doctor') ||
      window.location.hash.includes('doctor')
    );

    if (endpoint.startsWith('/assistant')) {
      token = localStorage.getItem('assistant_token');
    } else if (endpoint.startsWith('/doctor')) {
      const isAssistantContext = isAssistantPath || Boolean(endpoint.includes('doctor_id=') && localStorage.getItem('assistant_token'));
      if (isAssistantContext) {
        token = localStorage.getItem('assistant_token');
      } else {
        token = localStorage.getItem('doctor_token');
      }
    } else if (endpoint.startsWith('/admin')) {
      token = localStorage.getItem('admin_token');
    } else {
      // General endpoints (/auth/me, etc.): derive based on current active role view
      if (isAssistantPath) {
        token = localStorage.getItem('assistant_token');
      } else if (isDoctorPath) {
        token = localStorage.getItem('doctor_token');
      } else {
        token = localStorage.getItem('assistant_token') || localStorage.getItem('doctor_token') || localStorage.getItem('admin_token');
      }
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const isCacheable = isGet && (endpoint.startsWith('/doctors') || endpoint.startsWith('/health') || endpoint.startsWith('/reviews'));
  const cacheKey = `${endpoint}::${headers['Authorization'] || 'anon'}`;

  // 1. Check in-memory cache
  if (isCacheable) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data as T;
    }
    // 2. In-flight request deduplication: merge identical concurrent requests
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)! as Promise<T>;
    }
  }

  // If write operation (POST/PUT/DELETE/PATCH), invalidate related directory caches
  if (!isGet) {
    if (endpoint.startsWith('/booking') || endpoint.startsWith('/doctor') || endpoint.startsWith('/assistant')) {
      invalidateApiCache('/doctors');
    }
  }

  const fetchPromise = (async () => {
    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      headers,
    });

  if (!response.ok) {
    let errorMsg = response.status === 401
      ? 'Incorrect email or password.'
      : response.status === 403
      ? 'Access forbidden. Please verify your account role and privileges.'
      : response.status >= 500
      ? `Healthcare cloud server temporary issue (HTTP ${response.status}). Please retry in a few moments.`
      : 'An unexpected error occurred. Please try again.';
    try {
      const errData = await response.json();
      if (typeof errData.detail === 'string') {
        errorMsg = errData.detail;
      } else if (Array.isArray(errData.detail)) {
        errorMsg = errData.detail
          .map((item: any) => {
            const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
            const fieldLabel = field ? `${String(field).replace(/_/g, ' ')}: ` : '';
            return `${fieldLabel}${item.msg || JSON.stringify(item)}`;
          })
          .join('; ');
      } else if (errData.detail && typeof errData.detail === 'object') {
        errorMsg = errData.detail.message || errData.detail.msg || JSON.stringify(errData.detail);
      } else if (errData.message && typeof errData.message === 'string') {
        errorMsg = errData.message;
      }
    } catch {
      errorMsg = response.statusText || errorMsg;
    }

    // On 401 Unauthorized, automatically purge the invalid/expired token and notify subscribers
    if (response.status === 401) {
      const authHeader = headers['Authorization'] || '';
      const asstTok = localStorage.getItem('assistant_token');
      const docTok = localStorage.getItem('doctor_token');
      const adminTok = localStorage.getItem('admin_token');

      if (asstTok && authHeader.includes(asstTok)) {
        localStorage.removeItem('assistant_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:expired', { detail: { role: 'assistant', message: errorMsg } }));
        }
      } else if (docTok && authHeader.includes(docTok)) {
        localStorage.removeItem('doctor_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:expired', { detail: { role: 'doctor', message: errorMsg } }));
        }
      } else if (adminTok && authHeader.includes(adminTok)) {
        localStorage.removeItem('admin_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:expired', { detail: { role: 'admin', message: errorMsg } }));
        }
      }
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (isCacheable) {
    // Cache for 20 seconds in browser memory
    apiCache.set(cacheKey, { data, expiry: Date.now() + 20000 });
  }
  return data;
  })();

  if (isCacheable) {
    inFlightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => {
      inFlightRequests.delete(cacheKey);
    });
  }

  return fetchPromise;
}

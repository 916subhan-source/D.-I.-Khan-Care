/**
 * API client configuration for D.I. Khan Doctor Appointment System.
 * Ultra-fast web processing pipeline:
 * - Stale-While-Revalidate (SWR) in-memory micro-cache (0ms instant page loads & tab transitions)
 * - In-flight concurrent request deduplication
 * - Background keep-alive ping (zero serverless cold-starts)
 * - Fast prefetch utilities for hover and route transitions
 * - Hardened timeout management with exponential backoff retry
 */

const PROD_BACKEND_URL = 'https://d-i-khan-care.vercel.app/api/v1';

export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    try {
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

// ── Ultra-Fast SWR In-Memory Micro-Cache & Request Deduplication ──
interface CacheEntry<T = any> {
  data: T;
  freshUntil: number; // Within this window: serve in 0ms without re-fetching
  staleUntil: number; // Within this window: serve in 0ms AND revalidate in background
}

const apiCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    apiCache.clear();
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('swr_v1_')) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  } else {
    for (const key of apiCache.keys()) {
      if (key.includes(pattern)) {
        apiCache.delete(key);
      }
    }
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('swr_v1_') && k.includes(pattern)) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  }
}

/**
 * Prefetches an API endpoint into in-memory cache ahead of time
 * (e.g. on button hover, modal open, or route change).
 */
export function prefetchApi(endpoint: string) {
  if (typeof window === 'undefined') return;
  apiFetch(endpoint).catch(() => {});
}

// Background keep-alive ping to eliminate Vercel serverless cold starts
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      fetch(`${getApiBase()}/health`, { method: 'GET', keepalive: true }).catch(() => {});
    }
  }, 3.5 * 60 * 1000);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getEndpointTtl(endpoint: string): { freshMs: number; staleMs: number } {
  // Directory & Public views
  if (endpoint.startsWith('/doctors')) {
    return { freshMs: 30000, staleMs: 180000 };
  }
  // Fast portal view data
  if (endpoint.startsWith('/assistant/queue') || endpoint.startsWith('/doctor/appointments') || endpoint.startsWith('/doctor/overview')) {
    return { freshMs: 8000, staleMs: 60000 };
  }
  // Schedule / Slots / Pos days
  if (endpoint.startsWith('/doctor/slots') || endpoint.startsWith('/assistant/pos')) {
    return { freshMs: 15000, staleMs: 90000 };
  }
  // Profiles & Settings
  if (endpoint.startsWith('/doctor/profile') || endpoint.startsWith('/doctor/assistants')) {
    return { freshMs: 60000, staleMs: 300000 };
  }
  // Reviews & Health
  if (endpoint.startsWith('/reviews') || endpoint.startsWith('/health')) {
    return { freshMs: 45000, staleMs: 300000 };
  }
  return { freshMs: 10000, staleMs: 60000 };
}

// Generic API fetcher with token support, automatic retries, and SWR caching
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  // Derive authentication token based on path context
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
  const isCacheable = isGet && (
    endpoint.startsWith('/doctors') ||
    endpoint.startsWith('/health') ||
    endpoint.startsWith('/reviews') ||
    endpoint.startsWith('/assistant/queue') ||
    endpoint.startsWith('/assistant/pos/available-days') ||
    endpoint.startsWith('/doctor/overview') ||
    endpoint.startsWith('/doctor/appointments') ||
    endpoint.startsWith('/doctor/profile') ||
    endpoint.startsWith('/doctor/assistants') ||
    endpoint.startsWith('/doctor/slots/my-slots')
  );
  const cacheKey = `${endpoint}::${headers['Authorization'] || 'anon'}`;

  // 1. Check in-memory & persistent SWR cache (0ms instant return)
  if (isCacheable) {
    let cached = apiCache.get(cacheKey);

    // If not in-memory, inspect persistent client storage for instant render
    if (!cached && typeof window !== 'undefined') {
      try {
        const localRaw = localStorage.getItem(`swr_v1_${cacheKey}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (parsed && parsed.data) {
            cached = parsed;
            apiCache.set(cacheKey, parsed);
          }
        }
      } catch {}
    }

    if (cached) {
      const now = Date.now();
      // Case A: 100% Fresh -> Return immediately
      if (now < cached.freshUntil) {
        return cached.data as T;
      }
      // Case B: Stale-While-Revalidate -> Return stale cached data in 0ms AND trigger silent background fetch
      if (now < cached.staleUntil) {
        if (!inFlightRequests.has(cacheKey)) {
          const bgPromise = (async () => {
            try {
              const freshData = await executeNetworkFetch<T>(endpoint, options, headers);
              const { freshMs, staleMs } = getEndpointTtl(endpoint);
              const entry = {
                data: freshData,
                freshUntil: Date.now() + freshMs,
                staleUntil: Date.now() + staleMs,
              };
              apiCache.set(cacheKey, entry);
              if (typeof window !== 'undefined') {
                try { localStorage.setItem(`swr_v1_${cacheKey}`, JSON.stringify(entry)); } catch {}
              }
            } catch {}
          })();
          inFlightRequests.set(cacheKey, bgPromise);
          bgPromise.finally(() => inFlightRequests.delete(cacheKey));
        }
        return cached.data as T;
      }
    }

    // 2. In-flight request deduplication: merge identical concurrent requests
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)! as Promise<T>;
    }
  }

  // If write operation (POST/PUT/DELETE/PATCH), immediately invalidate related caches
  if (!isGet) {
    if (endpoint.startsWith('/booking')) {
      invalidateApiCache('/doctors');
      invalidateApiCache('/assistant');
      invalidateApiCache('/doctor');
    } else if (endpoint.startsWith('/assistant')) {
      invalidateApiCache('/assistant');
      invalidateApiCache('/doctor');
    } else if (endpoint.startsWith('/doctor')) {
      invalidateApiCache('/doctor');
      invalidateApiCache('/assistant');
    }
  }

  const fetchPromise = executeNetworkFetch<T>(endpoint, options, headers).then((data) => {
    if (isCacheable && data) {
      const { freshMs, staleMs } = getEndpointTtl(endpoint);
      const entry = {
        data,
        freshUntil: Date.now() + freshMs,
        staleUntil: Date.now() + staleMs,
      };
      apiCache.set(cacheKey, entry);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(`swr_v1_${cacheKey}`, JSON.stringify(entry)); } catch {}
      }
    }
    return data;
  });

  if (isCacheable) {
    inFlightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => {
      inFlightRequests.delete(cacheKey);
    });
  }

  return fetchPromise;
}

// Low-level network fetch execution with retries and error parsing
async function executeNetworkFetch<T>(endpoint: string, options: RequestInit, headers: Record<string, string>): Promise<T> {
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const apiBase = getApiBase();
  const maxRetries = isGet ? 2 : 1;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000); // 18-sec timeout guard

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if ([502, 503, 504].includes(response.status) && attempt < maxRetries && isGet) {
          await sleep(500 * Math.pow(2, attempt));
          continue;
        }

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

      // Response is OK — safely parse JSON
      let data: any = null;
      const text = await response.text();
      if (text && text.trim().length > 0) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('aborted')) {
        throw err;
      }

      if (attempt < maxRetries && isGet) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Connection failed. Please check your internet connection and try again.');
}

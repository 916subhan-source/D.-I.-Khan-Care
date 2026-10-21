/**
 * API client configuration for D.I. Khan Doctor Appointment System.
 */

const CLOUDFLARE_TUNNEL_DEFAULT = 'https://e0ca0c70150435.lhr.life/api/v1';

export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    // Check if a new tunnel URL was provided via query param, e.g. ?cf_tunnel=https://...
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryTunnel = urlParams.get('cf_tunnel') || urlParams.get('tunnel');
      if (queryTunnel && queryTunnel.trim().length > 0) {
        let clean = queryTunnel.trim().replace(/\/+$/, '');
        if (!clean.endsWith('/api/v1')) {
          clean += '/api/v1';
        }
        localStorage.setItem('cf_tunnel_url', clean);
      }
    } catch {
      // Ignore URL parsing errors
    }

    // Clean up known stale/expired tunnel URLs from previous sessions
    const customTunnel = localStorage.getItem('cf_tunnel_url');
    if (customTunnel && (customTunnel.includes('7c6c9138646ce2') || customTunnel.includes('loca.lt') || customTunnel.includes('pinggy'))) {
      localStorage.removeItem('cf_tunnel_url');
    }

    const isHttps = window.location.protocol === 'https:';
    const isCloudflarePages = window.location.hostname.includes('pages.dev');

    // On Cloudflare Pages, always use the relative edge proxy /api/v1 for 100% reliability
    if (isCloudflarePages) {
      return '/api/v1';
    }

    const activeTunnel = localStorage.getItem('cf_tunnel_url');
    if (activeTunnel && activeTunnel.trim().length > 0) {
      let clean = activeTunnel.trim().replace(/\/+$/, '');
      if (!clean.endsWith('/api/v1')) {
        clean += '/api/v1';
      }
      return clean;
    }

    const envBase = (import.meta as any).env?.VITE_API_BASE;
    if (envBase && typeof envBase === 'string' && envBase.trim().length > 0) {
      const trimmed = envBase.trim().replace(/\/+$/, '');
      if (isHttps && trimmed.startsWith('http://')) {
        return CLOUDFLARE_TUNNEL_DEFAULT;
      }
      return trimmed;
    }

    if (isHttps) {
      return CLOUDFLARE_TUNNEL_DEFAULT;
    }
  }

  const envBase = (import.meta as any).env?.VITE_API_BASE;
  if (envBase && typeof envBase === 'string' && envBase.trim().length > 0) {
    return envBase.trim().replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:8000/api/v1';
};

export const API_BASE = getApiBase();


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

  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
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

  return response.json();
}

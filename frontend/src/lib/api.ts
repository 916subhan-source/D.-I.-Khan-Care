/**
 * API client configuration for D.I. Khan Doctor Appointment System.
 */

const CLOUDFLARE_TUNNEL_DEFAULT = 'https://louisiana-vintage-terminal-information.trycloudflare.com/api/v1';

const getApiBase = () => {
  const envBase = (import.meta as any).env?.VITE_API_BASE;
  if (envBase && typeof envBase === 'string' && envBase.trim().length > 0) {
    return envBase.trim().replace(/\/+$/, '');
  }
  // If hosted on Cloudflare Pages (or custom domain), route requests via Cloudflare Tunnel
  if (typeof window !== 'undefined') {
    const isCloudflarePages = window.location.hostname.includes('pages.dev');
    const customTunnel = localStorage.getItem('cf_tunnel_url');
    if (customTunnel && customTunnel.trim().length > 0) {
      return customTunnel.trim().replace(/\/+$/, '');
    }
    if (isCloudflarePages) {
      return CLOUDFLARE_TUNNEL_DEFAULT;
    }
  }
  return '/api/v1';
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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
    try {
      const errData = await response.json();
      errorMsg = errData.detail || errorMsg;
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

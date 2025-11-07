/**
 * Cliente API centralizado para garantir URLs corretas em produção
 */
import { supabase } from '../lib/supabase';

const runtimeFallback = (typeof window !== 'undefined' && /esquerdai\.com$/.test(window.location.hostname))
  ? 'https://esquerdai-backend.vercel.app/api'
  : 'http://localhost:4000/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || runtimeFallback;

/**
 * Faz uma requisição para a API com a URL base correta e token de autenticação
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const finalEndpoint = cleanEndpoint.startsWith('api/') ? cleanEndpoint.slice(4) : cleanEndpoint;
  const url = `${API_BASE_URL}/${finalEndpoint}`;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const requestOptions: RequestInit = {
    method: options.method || 'GET',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, requestOptions);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const responseData = isJson ? await response.json() : await response.text();

    const base = { ok: response.ok, status: response.status };

    if (!response.ok) {
      const errorMessage =
        (isJson && (responseData?.message || responseData?.error || responseData?.detail)) ||
        (typeof responseData === 'string' ? responseData : 'Erro na requisição');
      return { success: false, error: errorMessage, data: responseData, ...base };
    }

    return { success: true, data: responseData, error: null, ...base };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error', data: null, ok: false, status: 0 };
  }
}

/**
 * Constrói uma URL completa para a API
 */
export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const finalEndpoint = cleanEndpoint.startsWith('api/') ? cleanEndpoint.slice(4) : cleanEndpoint;
  return `${API_BASE_URL}/${finalEndpoint}`;
};

/**
 * Obtém a URL base da API
 */
export const getApiBaseUrl = (): string => {
  return API_BASE_URL;
};
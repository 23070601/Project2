/**
 * api.js - Unified API communication layer for frontend static pages.
 * All HTML pages should only call functions in `Api`, not write fetch() scattered around.
 * 
 * @version 2.0
 * @author VNU-IS Group 2
 */

const Api = (() => {
  // ============================================
  // CONFIGURATION
  // ============================================
  
  // Get base URL from config or use default
  const BASE_URL = window.APP_CONFIG?.API_BASE_URL || '/api/v1';
  const TOKEN_KEY = window.APP_CONFIG?.TOKEN_KEY || 'vnuis_token';
  const USER_KEY = window.APP_CONFIG?.USER_KEY || 'vnuis_user';
  const DEMO_TOKEN_PREFIX = 'demo_';

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================
  
  function getToken() {

    return localStorage.getItem('vnuis_token') || 'demo_dev_token';


    
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getCurrentUser() {
    try {
      const userJson = localStorage.getItem(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      console.error('Failed to parse user data:', e);
      return null;
    }
  }

  function isTokenValid() {
    const token = getToken();
    if (!token) return false;
    
    // Check if token is expired (JWT)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() < exp;
    } catch (e) {
      // If can't parse JWT, assume it's valid (demo token)
      return true;
    }
  }

  function isAuthenticated() {
    return !!getToken();
  }

  // ============================================
  // URL HELPERS
  // ============================================
  
  function buildUrl(path, query) {
    let url = `${BASE_URL}${path}`;

    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    return url;
  }

    const currentUser = window.Auth ? Auth.getCurrentUser() : null;
    if (currentUser) {
      if (currentUser.user_id) headers['X-User-Id'] = String(currentUser.user_id);
      if (currentUser.email) headers['X-User-Email'] = currentUser.email;
    } else {
      headers['X-User-Email'] = 'tech.c@vnuis.edu.vn';


      headers['X-User-Id'] = '3';
    }

    const url = buildUrl(path, query);
    
    // Prepare headers
    const requestHeaders = { ...headers };
    const token = getToken();
    
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Add user context headers if available
    const user = getCurrentUser();
    if (user) {
      if (user.user_id) requestHeaders['X-User-Id'] = String(user.user_id);
      if (user.email) requestHeaders['X-User-Email'] = user.email;
      if (user.role) requestHeaders['X-User-Role'] = user.role;
    }

    // Set Content-Type only if not FormData
    if (!isFormData) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    // Prepare body
    let requestBody = body;
    if (body !== undefined && !isFormData) {
      requestBody = JSON.stringify(body);
    }

    // Log request for debugging (only in development)
    if (window.DEBUG_MODE) {
      console.log(`🚀 ${method} ${url}`, {
        headers: requestHeaders,
        body: isFormData ? 'FormData' : requestBody,
        query
      });
    }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody !== undefined ? requestBody : undefined,
      });

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      let payload = null;
      
      if (contentType && contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        const text = await response.text();
        if (text) {
          try {
            payload = JSON.parse(text);
          } catch {
            payload = { message: text };
          }
        }
      }

      // Handle error responses
      if (!response.ok) {
        const errorMessage = payload?.error?.message || 
                           payload?.message || 
                           `Request failed with status ${response.status}`;
        
        const error = new Error(errorMessage);
        error.status = response.status;
        error.details = payload?.error?.details || null;
        error.response = payload;

        // Handle 401 Unauthorized
        if (response.status === 401) {
          const currentToken = getToken();
          // Only clear token and redirect if NOT a demo token
          if (currentToken && !currentToken.startsWith(DEMO_TOKEN_PREFIX)) {
            removeToken();
            // Avoid redirect loop
            if (!window.location.pathname.includes('Login.html')) {
              redirectToLogin();
            }
          } else if (!currentToken) {
            redirectToLogin();
          }
        }

        throw error;
      }

      // Log success response (only in development)
      if (window.DEBUG_MODE) {
        console.log(`✅ ${method} ${path} ->`, payload?.data);
      }

      return payload?.data || payload;

    } catch (error) {
      // Log error (only in development)
      if (window.DEBUG_MODE) {
        console.error(`❌ ${method} ${path} error:`, error);
      }
      throw error;
    }
  }



  <<<<<<< HEAD
  // ============================================
  // PUBLIC API
  // ============================================
  
  return {
    // HTTP Methods
=======


const api = {
    get: (path, query) => request(path, { method: 'GET', query }),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    delete: (path) => request(path, { method: 'DELETE' }),
    
    // File Upload (multipart/form-data)
    upload: (path, formData, query) => request(path, { 
      method: 'POST', 
      body: formData, 
      query, 
      isFormData: true 
    }),
    
    // Upload with PUT method
    uploadPut: (path, formData, query) => request(path, { 
      method: 'PUT', 
      body: formData, 
      query, 
      isFormData: true 
    }),

    // Token Management
    getToken,
    setToken,
    removeToken,
    isAuthenticated,
    isTokenValid,
    getCurrentUser,

    // URL Helpers
    buildUrl,
    resolveLoginPath,
    redirectToLogin,
  };

  if (typeof window !== 'undefined') {
    window.Api = api;
  }



  return api;
})();

// ============================================
// EXPOSE FOR LEGACY CODE
// ============================================
// Keep backward compatibility for pages that use old Api functions
if (typeof window.Api === 'undefined') {
  window.Api = Api;
}

// ============================================
// AUTO-INITIALIZATION
// ============================================
// Check token validity on page load
document.addEventListener('DOMContentLoaded', () => {
  // Skip login page and public pages
  if (window.location.pathname.includes('Login.html')) return;
  
  // Check if token is valid
  const token = Api.getToken();
  if (token && !Api.isTokenValid()) {
    console.warn('⚠️ Token expired, redirecting to login...');
    Api.removeToken();
    Api.redirectToLogin();
  }
});

// ============================================
// USAGE EXAMPLES
// ============================================
/*
// 1. GET request
const classrooms = await Api.get('/classrooms');

// 2. GET with query params
const assets = await Api.get('/assets', { roomId: 1, status: 'Operational' });

// 3. POST with JSON body
const report = await Api.post('/faultReports', {
  assetId: 5,
  description: 'Projector not working',
  priority: 'High'
});

// 4. File upload
const formData = new FormData();
formData.append('evidence', file);
const result = await Api.upload('/faultReports/upload', formData);

// 5. Token management
const token = Api.getToken();
const isAuth = Api.isAuthenticated();
Api.setToken(newToken);
Api.removeToken();

// 6. Get current user
const user = Api.getCurrentUser();
console.log('Logged in as:', user?.full_name);
*/
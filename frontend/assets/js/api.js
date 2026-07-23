/**
 * api.js - lớp giao tiếp duy nhất giữa frontend tĩnh và backend REST API.
 * Mọi trang HTML chỉ gọi qua các hàm trong `Api`, không tự viết fetch() rải rác.
 */
const Api = (() => {
  const BASE_URL = window.APP_CONFIG.API_BASE_URL;

  function getToken() {
    return localStorage.getItem('vnuis_token');
  }

  async function request(path, { method = 'GET', body, query } = {}) {
    let url = `${BASE_URL}${path}`;

    if (query) {
      const params = new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
      );
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // 204 No Content không có body để parse
    if (response.status === 204) return null;

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.error?.message || `Request failed with status ${response.status}`;

      // Token hết hạn/không hợp lệ -> đưa về trang đăng nhập
      if (response.status === 401) {
        localStorage.removeItem('vnuis_token');
        localStorage.removeItem('vnuis_user');
        if (!location.pathname.endsWith('Login.html')) {
          location.href = resolveLoginPath();
        }
      }

      const err = new Error(message);
      err.status = response.status;
      err.details = payload?.error?.details;
      throw err;
    }

    return payload?.data;
  }

  // Đường dẫn Login.html tương đối theo vị trí thư mục hiện tại (users/technicians/managers)
  function resolveLoginPath() {
    return '../users/Login.html';
  }

  return {
    get: (path, query) => request(path, { method: 'GET', query }),
    post: (path, body) => request(path, { method: 'POST', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    delete: (path) => request(path, { method: 'DELETE' }),
    getToken,
  };
})();

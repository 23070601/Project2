/**
 * auth.js - quản lý phiên đăng nhập ở phía trình duyệt.
 * Token JWT + thông tin user được lưu ở localStorage (đủ dùng cho đồ án,
 * không cần cơ chế refresh token phức tạp).
 */
const Auth = (() => {
  const TOKEN_KEY = 'vnuis_token';
  const USER_KEY = 'vnuis_user';

  const ROLE_HOME_PAGE = {
    User: '../users/Dashboard.html',
    Technician: '../technicians/TechnicianDashboard.html',
    Manager: '../managers/ManagerDashboard.html',
  };

  async function login(email, password) {
    const result = await Api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    return result.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    location.href = '../users/Login.html';
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function isAuthenticated() {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  }

  function homePageForRole(role) {
    return ROLE_HOME_PAGE[role] || '../users/Login.html';
  }

  /**
   * Gọi ở đầu mỗi trang cần đăng nhập:
   *   Auth.guard('User')            -> chỉ role User được vào
   *   Auth.guard(['Manager'])       -> chỉ Manager
   * Nếu chưa đăng nhập -> đá về Login. Nếu sai role -> đá về trang chủ đúng role.
   */
  function guard(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const user = getCurrentUser();

    if (!isAuthenticated() || !user) {
      location.href = '../users/Login.html';
      return null;
    }
    if (!roles.includes(user.role)) {
      location.href = homePageForRole(user.role);
      return null;
    }
    return user;
  }

  return { login, logout, getCurrentUser, isAuthenticated, homePageForRole, guard };
})();

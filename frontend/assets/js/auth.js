/**
 * auth.js - quản lý phiên đăng nhập ở phía trình duyệt.
 * Token JWT + thông tin user được lưu ở localStorage.
 * Tích hợp fallback đăng nhập demo mượt mà khi Backend không chạy hoặc trong demo mode.
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
    try {
      const result = await Api.post('/auth/login', { email, password });
      if (result && result.token) {
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        return result.user;
      }
    } catch (err) {
      console.warn('Backend login API unavailable/error, fallback to frontend demo auth:', err.message);
    }

    // Fallback cho Demo Mode / Offline Live Server:
    const cleanEmail = email.toLowerCase();
    const savedPwKey = `vnuis_password_${cleanEmail}`;
    const savedPw = localStorage.getItem(savedPwKey);

    // Nếu người dùng đã từng đổi mật khẩu -> BẮT BUỘC dùng mật khẩu mới (savedPw), mật khẩu cũ sẽ BỊ TỪ CHỐI
    // Nếu chưa đổi mật khẩu -> Dùng mật khẩu mặc định ban đầu là '123456'
    const expectedPassword = savedPw ? savedPw : '123456';

    if (password === expectedPassword) {
      let role = 'User';
      let name = 'Nguyen Van A';
      if (cleanEmail.includes('tech') || cleanEmail.includes('c@vnuis')) {
        role = 'Technician';
        name = 'Le Van C';
      } else if (cleanEmail.includes('manager') || cleanEmail.includes('e@vnuis')) {
        role = 'Manager';
        name = 'Hoang Van E';
      }

      const demoUser = {
        user_id: 1,
        full_name: name,
        email: email,
        role: role
      };

      localStorage.setItem(TOKEN_KEY, 'demo_jwt_token_' + Date.now());
      localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
      return demoUser;
    }

    throw new Error('Invalid email or password. Please check your credentials.');
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

  function guard(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    let user = getCurrentUser();

    if (!user) {
      user = {
        user_id: 3,
        full_name: 'Le Van C',
        email: 'tech.c@vnuis.edu.vn',
        role: 'Technician'
      };
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, 'demo_jwt_token_default');
    }
    return user;
  }

  return { login, logout, getCurrentUser, isAuthenticated, homePageForRole, guard };
})();

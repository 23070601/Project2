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

  async function login(email, password, selectedRole) {
    let user = null;
    let realToken = null;
    try {
      const result = await Api.post('/auth/login', { email, password });
      if (result && result.token) {
        user = result.user;
        realToken = result.token;
      }
    } catch (err) {
      console.warn('Backend login API unavailable/error, fallback to frontend demo auth:', err.message);
    }

    if (!user) {
      // Fallback cho Demo Mode / Offline Live Server:
      const cleanEmail = email.toLowerCase();
      const savedPwKey = `vnuis_password_${cleanEmail}`;
      const savedPw = localStorage.getItem(savedPwKey);
      const expectedPassword = savedPw ? savedPw : '123456';

      if (password === expectedPassword) {
        const selRoleNorm = selectedRole ? (selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).toLowerCase()) : null;

        let role = 'User';
        let name = 'Nguyen Van A';

        if (cleanEmail.includes('tech') || cleanEmail.includes('c@vnuis')) {
          role = 'Technician';
          name = 'Le Van C';
        } else if (cleanEmail.includes('manager') || cleanEmail.includes('e@vnuis')) {
          role = 'Manager';
          name = 'Hoang Van E';
        } else if (selRoleNorm) {
          role = selRoleNorm;
          name = role === 'Technician' ? 'Le Van C' : (role === 'Manager' ? 'Hoang Van E' : 'Nguyen Van A');
        }

        user = {
          user_id: role === 'Manager' ? 2 : (role === 'Technician' ? 3 : 1),
          full_name: name,
          email: email,
          role: role
        };
      } else {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
    }

    // Check if account role matches the selected role tab
    if (selectedRole) {
      const normSelected = selectedRole.toLowerCase();
      const normUserRole = (user.role || '').toLowerCase();
      if (normSelected !== normUserRole) {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
    }

    localStorage.setItem(TOKEN_KEY, realToken || ('demo_jwt_token_' + Date.now()));
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
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
    let user = getCurrentUser();

    if (!user) {
      location.href = '../users/Login.html';
      return null;
    }

    if (allowedRoles) {
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (roles.length > 0 && !roles.includes(user.role)) {
        alert(`Access Denied: Your account role (${user.role}) is not authorized to access this page. Redirecting to your dashboard...`);
        location.href = homePageForRole(user.role);
        return null;
      }
    }

    return user;
  }

  return { login, logout, getCurrentUser, isAuthenticated, homePageForRole, guard };
})();

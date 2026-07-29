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
      const cleanEmail = email.toLowerCase().trim();
      const savedPwKey = `vnuis_password_${cleanEmail}`;
      const savedPw = localStorage.getItem(savedPwKey);
      const expectedPassword = savedPw ? savedPw : '123456';

      if (password === expectedPassword) {
        const selRoleNorm = selectedRole ? (selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).toLowerCase()) : null;

        // Catalog các tài khoản seed khớp dữ liệu vnuis_asset_maintenance_dss.sql
        const DEMO_USERS = {
          'lecturer.a@vnuis.edu.vn': { user_id: 1, full_name: 'Nguyen Van A', role: 'User' },
          'student.b@vnuis.edu.vn':  { user_id: 2, full_name: 'Tran Thi B',   role: 'User' },
          'tech.c@vnuis.edu.vn':     { user_id: 3, full_name: 'Le Van C',     role: 'Technician' },
          'tech.d@vnuis.edu.vn':     { user_id: 4, full_name: 'Pham Thi D',   role: 'Technician' },
          'manager.e@vnuis.edu.vn':  { user_id: 5, full_name: 'Hoang Van E',  role: 'Manager' },
          'tech.f@vnuis.edu.vn':     { user_id: 6, full_name: 'Vu Van F',     role: 'Technician' },
          'lecturer.g@vnuis.edu.vn': { user_id: 7, full_name: 'Doan Van G',   role: 'User' },
          'student.h@vnuis.edu.vn':  { user_id: 8, full_name: 'Bui Thi H',    role: 'User' },
        };

        let seedUser = DEMO_USERS[cleanEmail];
        if (!seedUser) {
          const matchedKey = Object.keys(DEMO_USERS).find(k => k.startsWith(cleanEmail) || cleanEmail.startsWith(k.split('@')[0]));
          if (matchedKey) seedUser = DEMO_USERS[matchedKey];
        }

        if (seedUser) {
          user = {
            user_id: seedUser.user_id,
            full_name: seedUser.full_name,
            email: email,
            role: seedUser.role
          };
        } else {
          let role = selRoleNorm || 'User';
          if (cleanEmail.includes('tech')) role = 'Technician';
          else if (cleanEmail.includes('manager') || cleanEmail.includes('admin')) role = 'Manager';

          const prefix = cleanEmail.split('@')[0] || 'User';
          const nameFormatted = prefix.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

          user = {
            user_id: 99,
            full_name: nameFormatted,
            email: email,
            role: role
          };
        }
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

  const auth = { login, logout, getCurrentUser, isAuthenticated, homePageForRole, guard };

  if (typeof window !== 'undefined') {
    window.Auth = auth;
  }

  return auth;
})();

/**
 * layout.js - nạp partial sidebar/topbar dùng chung vào mọi trang, để tránh
 * lặp lại ~150 dòng HTML header/sidebar ở từng file như bản mockup gốc.
 *
 * Cách dùng trong mỗi trang:
 *   <div id="sidebar-placeholder"></div>
 *   <div id="topbar-placeholder"></div>
 *   ...
 *   <script src="../assets/js/config.js"></script>
 *   <script src="../assets/js/api.js"></script>
 *   <script src="../assets/js/auth.js"></script>
 *   <script src="../assets/js/layout.js"></script>
 *   <script>
 *     const user = Auth.guard('User');              // hoặc ['Manager','Technician']
 *     Layout.init({ role: 'User', activePage: 'Dashboard' });
 *   </script>
 */
const Layout = (() => {
  const SIDEBAR_FILE = {
    User: '../partials/sidebar-user.html',
    Technician: '../partials/sidebar-technician.html',
    Manager: '../partials/sidebar-manager.html',
  };

  async function loadPartial(url, targetSelector) {
    const target = document.querySelector(targetSelector);
    if (!target) return;
    const res = await fetch(url);
    target.innerHTML = await res.text();
  }

  function highlightActiveNav(activePage) {
    document.querySelectorAll('.nav-link').forEach((link) => {
      const isActive = link.dataset.page === activePage;
      link.classList.toggle('bg-primary-fixed', isActive);
      link.classList.toggle('text-primary', isActive);
      link.classList.toggle('font-bold', isActive);
      link.classList.toggle('text-on-surface-variant', !isActive);
      link.classList.toggle('hover:bg-surface-container-low', !isActive);
    });
  }

  function fillTopbarUser(user) {
    const nameEl = document.getElementById('topbarUserName');
    const roleEl = document.getElementById('topbarUserRole');
    const avatarEl = document.getElementById('topbarUserAvatar');
    if (nameEl) nameEl.textContent = user.full_name;
    if (roleEl) roleEl.textContent = user.role;
    if (avatarEl) avatarEl.textContent = user.full_name?.charAt(0)?.toUpperCase() || '?';
  }

  function wireLogout() {
    const btn = document.getElementById('logoutBtn');
    if (btn) btn.addEventListener('click', () => Auth.logout());
  }

  function wireNotificationBell() {
    const bell = document.getElementById('notificationBell');
    const dropdown = document.getElementById('notificationDropdown');
    if (!bell || !dropdown) return;

    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
      if (!dropdown.classList.contains('hidden') && window.Notifications) {
        Notifications.loadDropdown();
      }
    });
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== bell) {
        dropdown.classList.add('hidden');
      }
    });
  }

  function wireUserProfileDropdown() {
    const btn = document.getElementById('userProfileBtn');
    const dropdown = document.getElementById('userProfileDropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  async function init({ role, activePage }) {
    await loadPartial(SIDEBAR_FILE[role], '#sidebar-placeholder');
    await loadPartial('../partials/topbar.html', '#topbar-placeholder');

    highlightActiveNav(activePage);

    const user = Auth.getCurrentUser();
    if (user) fillTopbarUser(user);

    wireLogout();
    wireNotificationBell();
    wireUserProfileDropdown();

    if (window.Notifications) {
      Notifications.loadDropdown();
      Notifications.startPolling();
    }
  }

  return { init };
})();

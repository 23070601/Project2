/**
 * layout.js - nạp partial sidebar/topbar/footer dùng chung vào mọi trang, để đảm bảo
 * cấu trúc layout (sidebar, header, footer) nhất quán theo chuẩn Role Technician.
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
    const res = await fetch(url, { cache: 'no-cache' });
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
    const btns = document.querySelectorAll('#logoutBtn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => Auth.logout());
    });
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

    let footerTarget = document.querySelector('#footer-placeholder');
    if (!footerTarget) {
      footerTarget = document.createElement('div');
      footerTarget.id = 'footer-placeholder';
      document.body.appendChild(footerTarget);
    }
    await loadPartial('../partials/footer.html', '#footer-placeholder');

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

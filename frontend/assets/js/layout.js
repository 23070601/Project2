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
      if (!dropdown.contains(e.target) && !bell.contains(e.target)) {
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

  function setSidebarOpen(isOpen) {
    const sidebar = document.querySelector('#sidebar-placeholder > aside');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;

    sidebar.classList.toggle('-translate-x-full', !isOpen);
    sidebar.classList.toggle('translate-x-0', isOpen);
    if (backdrop) {
      backdrop.classList.toggle('hidden', !isOpen);
    }
  }

  function syncSidebarVisibility() {
    const sidebar = document.querySelector('#sidebar-placeholder > aside');
    if (!sidebar) return;

    if (window.innerWidth >= 768) {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
    } else {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
    }
  }

  function wireMobileSidebar() {
    const toggle = document.getElementById('mobileSidebarToggle');
    const backdrop = document.getElementById('sidebarBackdrop');
    const sidebar = document.querySelector('#sidebar-placeholder > aside');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setSidebarOpen(!sidebar.classList.contains('translate-x-0'));
    });

    if (backdrop) {
      backdrop.addEventListener('click', () => setSidebarOpen(false));
    }

    document.querySelectorAll('#sidebar-placeholder .nav-link').forEach((link) => {
      link.addEventListener('click', () => setSidebarOpen(false));
    });

    window.addEventListener('resize', syncSidebarVisibility);
    syncSidebarVisibility();
  }

  async function init({ role, activePage }) {
    await loadPartial(SIDEBAR_FILE[role], '#sidebar-placeholder');
    await loadPartial('../partials/topbar.html', '#topbar-placeholder');

    // Set correct "View all notifications" link based on role
    const viewAllLink = document.getElementById('viewAllNotificationsLink');
    if (viewAllLink) {
      const rolePaths = {
        User: '../users/Notifications.html',
        Technician: '../technicians/Notifications.html',
        Manager: '../managers/Notifications.html',
      };
      viewAllLink.href = rolePaths[role] || 'Notifications.html';
    }

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
    wireMobileSidebar();

    if (window.Notifications) {
      // Load dropdown immediately since topbar is already in DOM
      try {
        await Notifications.loadDropdown();
        await Notifications.refreshBadge();
      } catch (e) {
        console.warn('Initial notification load failed:', e);
      }
      Notifications.startPolling();
    }
  }

  return { init };
})();

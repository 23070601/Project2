/**
 * notifications.js - dùng chung cho topbar (dropdown) và các trang
 * Notification.html / Notifications.html của cả 3 vai trò.
 */
const Notifications = (() => {
  let pollTimer = null;

  function timeAgo(isoString) {
    const diffMs = Date.now() - new Date(isoString.replace(' ', 'T')).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  async function refreshBadge() {
    try {
      const { unreadCount } = await Api.get('/notifications/unread-count');
      const badge = document.getElementById('notificationBadge');
      if (badge) badge.classList.toggle('hidden', unreadCount === 0);
    } catch (e) {
      // Không chặn UI nếu lỗi mạng tạm thời
      console.warn('Failed to refresh notification badge', e.message);
    }
  }

  function renderList(items, container) {
    if (items.length === 0) {
      container.innerHTML = `<p class="px-4 py-6 text-center text-on-surface-variant text-body-sm">No notifications yet</p>`;
      return;
    }

    container.innerHTML = items
      .map(
        (n) => `
      <a href="#" data-id="${n.notification_id}"
         class="notif-item flex gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/5 ${n.is_read ? 'opacity-60' : ''}">
        <div class="mt-1 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-brand-blue text-[18px]">schedule</span>
        </div>
        <div class="flex-1">
          <p class="text-body-sm text-on-surface leading-tight">${n.message}</p>
          <p class="text-[10px] text-on-surface-variant mt-1">${timeAgo(n.created_at)}</p>
        </div>
      </a>`
      )
      .join('');

    container.querySelectorAll('.notif-item').forEach((el) => {
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        await Api.patch(`/notifications/${el.dataset.id}/read`);
        el.classList.add('opacity-60');
        refreshBadge();
      });
    });
  }

  async function loadDropdown() {
    const container = document.getElementById('notificationList');
    if (!container) return;
    const items = await Api.get('/notifications', { limit: 10 });
    renderList(items, container);
  }

  // Dùng cho trang Notification(s).html full-page
  async function loadFullList(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const items = await Api.get('/notifications', { limit: 100 });
    renderList(items, container);
  }

  function wireMarkAllRead() {
    const btn = document.getElementById('markAllReadBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await Api.patch('/notifications/read-all');
      loadDropdown();
      refreshBadge();
    });
  }

  function startPolling() {
    refreshBadge();
    wireMarkAllRead();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refreshBadge, 30000); // 30s
  }

  return { loadDropdown, loadFullList, startPolling, refreshBadge, timeAgo };
})();

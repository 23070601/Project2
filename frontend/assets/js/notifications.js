/**
 * notifications.js - dùng chung cho topbar (dropdown) và các trang
 * Notification.html / Notifications.html của cả 3 vai trò.
 */
const Notifications = (() => {
  let pollTimer = null;

  const SAMPLE_ITEMS = [
    {
      notification_id: 1,
      title: 'New WorkOrder assigned',
      message: 'WO-2024-001 has been assigned to you.',
      created_at: new Date(Date.now() - 5 * 60000).toISOString(),
      is_read: false,
      order_id: 1,
      dotColor: 'bg-primary'
    },
    {
      notification_id: 2,
      title: 'WorkOrder priority updated',
      message: 'WO-2024-005 priority changed to High.',
      created_at: new Date(Date.now() - 30 * 60000).toISOString(),
      is_read: false,
      order_id: 5,
      dotColor: 'bg-amber-600'
    },
    {
      notification_id: 3,
      title: 'Repair report submitted',
      message: 'WO-2024-008 repair report was submitted.',
      created_at: new Date(Date.now() - 120 * 60000).toISOString(),
      is_read: true,
      order_id: 8,
      dotColor: 'bg-green-600'
    }
  ];

  function timeAgo(isoString) {
    if (!isoString) return 'recently';
    const date = new Date(isoString.includes('T') ? isoString : isoString.replace(' ', 'T'));
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  async function refreshBadge(customItems) {
    let unreadCount = 3;
    try {
      if (window.Api && window.Auth && Auth.isAuthenticated()) {
        const res = await Api.get('/notifications/unread-count');
        if (res && typeof res.unreadCount === 'number') {
          unreadCount = res.unreadCount;
        }
      } else if (customItems) {
        unreadCount = customItems.filter(n => !n.is_read).length;
      }
    } catch (e) {
      if (customItems) unreadCount = customItems.filter(n => !n.is_read).length;
    }

    const badge = document.getElementById('notificationBadge');
    if (badge) {
      badge.classList.toggle('hidden', unreadCount === 0);
    }
    const countPill = document.getElementById('notificationUnreadCount');
    if (countPill) {
      countPill.textContent = unreadCount;
      countPill.classList.toggle('hidden', unreadCount === 0);
    }
  }

  function renderList(items, container, isDropdown = true) {
    const listToRender = isDropdown ? items.slice(0, 3) : items;
    if (!container) return;

    if (listToRender.length === 0) {
      container.innerHTML = `<p class="p-6 text-center text-on-surface-variant text-body-sm">No notifications yet</p>`;
      return;
    }

    container.innerHTML = listToRender
      .map(
        (n) => `
      <div class="p-4 ${n.is_read ? 'bg-white' : 'bg-primary-fixed/20'} border-b border-outline-variant/10 flex gap-3 cursor-pointer hover:${n.is_read ? 'bg-surface-container-low' : 'bg-primary-fixed/30'} transition-colors notif-item"
           data-id="${n.notification_id}"
           onclick="location.href='${n.order_id ? `WorkOrderDetails.html?id=${n.order_id}` : 'AssignedTasks.html'}'">
        <div class="w-2 h-2 mt-2 rounded-full ${n.dotColor || (n.is_read ? 'bg-amber-600' : 'bg-primary')} shrink-0"></div>
        <div class="flex flex-col gap-1">
          <p class="text-body-sm ${n.is_read ? 'font-medium' : 'font-bold'} text-on-surface">${n.title || n.message || 'Notification'}</p>
          <p class="text-label-md text-on-surface-variant">${n.message}</p>
          <p class="text-[10px] text-outline mt-1">${timeAgo(n.created_at)}</p>
        </div>
      </div>`
      )
      .join('');

    container.querySelectorAll('.notif-item').forEach((el) => {
      el.addEventListener('click', async () => {
        try {
          if (window.Api && window.Auth && Auth.isAuthenticated()) {
            await Api.patch(`/notifications/${el.dataset.id}/read`);
          }
        } catch (err) {}
        refreshBadge();
      });
    });
  }

  async function loadDropdown() {
    const container = document.getElementById('notificationList');
    if (!container) return;
    let items = SAMPLE_ITEMS;
    try {
      if (window.Api && window.Auth && Auth.isAuthenticated()) {
        const data = await Api.get('/notifications', { limit: 10 });
        if (data && Array.isArray(data) && data.length > 0) {
          items = data;
        }
      }
    } catch (e) {
      console.warn('Failed to load notifications from API, using demo items', e.message);
    }
    renderList(items, container, true);
    refreshBadge(items);
  }

  // Dùng cho trang Notification(s).html full-page
  async function loadFullList(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    let items = SAMPLE_ITEMS;
    try {
      if (window.Api && window.Auth && Auth.isAuthenticated()) {
        const data = await Api.get('/notifications', { limit: 100 });
        if (data && Array.isArray(data) && data.length > 0) {
          items = data;
        }
      }
    } catch (e) {
      console.warn('Failed to load full notifications from API, using demo items', e.message);
    }
    renderList(items, container, false);
  }

  function wireMarkAllRead() {
    const btn = document.getElementById('markAllReadBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try {
        if (window.Api && window.Auth && Auth.isAuthenticated()) {
          await Api.patch('/notifications/read-all');
        }
      } catch (e) {}
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

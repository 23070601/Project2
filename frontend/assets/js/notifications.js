/**
 * notifications.js - shared UI for the topbar dropdown and notification pages
 * for all three roles.
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

  function normalizeNotification(item) {
    return {
      notification_id: item.notification_id || item.id,
      title: item.title || item.message || 'Notification',
      message: item.message || item.title || 'You have a new notification',
      created_at: item.created_at || item.createdAt || new Date().toISOString(),
      is_read: Boolean(item.is_read ?? item.read),
      order_id: item.order_id ?? item.orderId ?? null,
      report_id: item.report_id ?? item.reportId ?? null,
      dotColor: item.dotColor || (item.is_read ? 'bg-amber-600' : 'bg-primary')
    };
  }

  function sortNotifications(items) {
    return [...(items || [])].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }

  function resolveNotificationTarget(item) {
    const pathname = window.location.pathname || '';
    const role = (window.Auth?.getCurrentUser?.()?.role || '').toLowerCase();
    const isManager = pathname.includes('/managers/') || role === 'manager';
    const isTechnician = pathname.includes('/technicians/') || role === 'technician';

    if (isManager) {
      if (item.report_id) return `PendingRequestDetail.html?id=${item.report_id}`;
      if (item.order_id) return `WorkOrderDetails.html?id=${item.order_id}`;
      return 'PendingRequest.html';
    }

    if (isTechnician) {
      if (item.order_id) return `WorkOrderDetails.html?id=${item.order_id}`;
      return 'AssignedTasks.html';
    }

    if (item.report_id) return `ReportDetails.html?id=${item.report_id}`;
    if (item.order_id) return 'ListReports.html';
    return 'ListReports.html';
  }

  function markBadgeVisibility(unreadCount) {
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

  async function refreshBadge(customItems) {
    let unreadCount = 0;
    const normalizedItems = (customItems || []).map(normalizeNotification);

    if (normalizedItems.length > 0) {
      unreadCount = normalizedItems.filter((n) => !n.is_read).length;
    }

    if (window.Api) {
      try {
        const res = await Api.get('/notifications/unread-count');
        if (res && typeof res.unreadCount === 'number') {
          unreadCount = res.unreadCount;
        } else if (typeof res === 'number') {
          unreadCount = res;
        }
      } catch (e) {
        unreadCount = normalizedItems.length > 0 ? unreadCount : 0;
      }
    }

    markBadgeVisibility(unreadCount);
  }

  async function markNotificationAsRead(id, items, container, isDropdown = true) {
    if (!id) return;

    const currentItems = Array.isArray(items) ? items : [];
    const target = currentItems.find((n) => String(n.notification_id) === String(id));
    if (target) {
      target.is_read = true;
    }

    try {
      if (window.Api) {
        await Api.patch(`/notifications/${id}/read`);
      }
    } catch (err) {}

    if (container) {
      renderList(currentItems, container, isDropdown);
    }
    refreshBadge(currentItems);
  }

  function renderList(items, container, isDropdown = true) {
    const latestItems = sortNotifications(items || []).map(normalizeNotification);
    const listToRender = latestItems.slice(0, isDropdown ? 3 : undefined);
    if (!container) return;

    if (listToRender.length === 0) {
      container.innerHTML = `<p class="p-6 text-center text-on-surface-variant text-body-sm">No notifications yet</p>`;
      return;
    }

    container.innerHTML = listToRender
      .map((n) => `
      <div class="notif-card p-4 ${n.is_read ? 'bg-white' : 'bg-primary-fixed/20'} border-b border-outline-variant/10 flex gap-3 cursor-pointer hover:${n.is_read ? 'bg-surface-container-low' : 'bg-primary-fixed/30'} transition-colors"
           data-id="${n.notification_id}"
           data-status="${n.is_read ? 'read' : 'unread'}">
        <div class="w-2 h-2 mt-2 rounded-full ${n.dotColor || (n.is_read ? 'bg-amber-600' : 'bg-primary')} shrink-0"></div>
        <div class="flex flex-col gap-1">
          <p class="text-body-sm ${n.is_read ? 'font-medium' : 'font-bold'} text-on-surface">${n.title || n.message || 'Notification'}</p>
          <p class="text-label-md text-on-surface-variant">${n.message}</p>
          <p class="text-[10px] text-outline mt-1">${timeAgo(n.created_at)}</p>
        </div>
      </div>`)
      .join('');

    container.querySelectorAll('.notif-card').forEach((el) => {
      el.addEventListener('click', async () => {
        const id = el.dataset.id;
        const targetItem = (items || []).find((n) => String(n.notification_id || n.id) === String(id));
        if (targetItem && !targetItem.is_read) {
          await markNotificationAsRead(id, items, container, isDropdown);
        }

        if (targetItem) {
          const targetPath = resolveNotificationTarget(targetItem);
          if (targetPath) {
            window.location.assign(targetPath);
          }
        }
      });
    });
  }

  async function loadDropdown() {
    const container = document.getElementById('notificationList');
    if (!container) return;

    let items = [];
    try {
      if (window.Api) {
        const data = await Api.get('/notifications', { limit: 10 });
        if (data && Array.isArray(data)) {
          items = sortNotifications(data.map(normalizeNotification));
        }
      }
    } catch (e) {
      console.warn('Failed to load notifications from API', e.message);
      items = [];
    }

    renderList(items, container, true);
    refreshBadge(items);
  }

  // Used by full-page notification screens
  async function loadFullList(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    let items = [];
    try {
      if (window.Api) {
        const data = await Api.get('/notifications', { limit: 100 });
        if (data && Array.isArray(data)) {
          items = sortNotifications(data.map(normalizeNotification));
        }
      }
    } catch (e) {
      console.warn('Failed to load full notifications from API', e.message);
      items = [];
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

  function initializeDropdown() {
    const container = document.getElementById('notificationList');
    if (!container) {
      setTimeout(initializeDropdown, 100);
      return;
    }
    loadDropdown();
    refreshBadge();
  }

  function startPolling() {
    refreshBadge();
    wireMarkAllRead();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      refreshBadge();
      loadDropdown();
    }, 30000); // 30s
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeDropdown, 150);
  });

  window.addEventListener('load', () => {
    setTimeout(initializeDropdown, 200);
  });

  return { loadDropdown, loadFullList, startPolling, refreshBadge, timeAgo };
})();

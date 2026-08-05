/**
 * notifications.js - Shared UI engine for the topbar dropdown and role-based notification pages.
 * Handles dynamic API fetching, unread badges, real-time polling, and accurate routing.
 */
const Notifications = (() => {
  let pollTimer = null;

  function timeAgo(isoString) {
    if (!isoString) return 'recently';
    const str = String(isoString);
    const date = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
    if (isNaN(date.getTime())) return 'recently';
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  function deriveTitleAndMessage(item) {
    if (!item) return { title: 'Notification', message: '' };
    const rawMsg = item.message || item.content || '';
    if (item.title && item.title !== rawMsg) {
      return { title: item.title, message: rawMsg };
    }

    let derivedTitle = 'System Notification';
    const lower = rawMsg.toLowerCase();

    if (lower.includes('assigned') || lower.includes('giao')) {
      derivedTitle = item.order_id ? `Work Order #${item.order_id} Assigned` : 'New Work Order Assigned';
    } else if (lower.includes('rejected') || lower.includes('từ chối')) {
      derivedTitle = 'Request / Order Rejected';
    } else if (lower.includes('completed') || lower.includes('sửa xong') || lower.includes('hoàn thành')) {
      derivedTitle = item.order_id ? `Work Order #${item.order_id} Completed` : 'Report Resolved';
    } else if (lower.includes('closed') || lower.includes('đóng')) {
      derivedTitle = 'Work Order Closed';
    } else if (lower.includes('fault report') || lower.includes('báo hỏng')) {
      derivedTitle = item.report_id ? `Fault Report #${item.report_id}` : 'Fault Report Update';
    } else if (item.order_id) {
      derivedTitle = `Work Order #${item.order_id}`;
    } else if (item.report_id) {
      derivedTitle = `Fault Report #${item.report_id}`;
    }

    return { title: derivedTitle, message: rawMsg };
  }

  function normalizeNotification(item) {
    if (!item) return {};
    const id = item.notification_id || item.id || Math.random();
    const { title, message } = deriveTitleAndMessage(item);
    const isRead = Boolean(item.is_read || item.isRead);

    return {
      notification_id: id,
      title: title,
      message: message,
      created_at: item.created_at || new Date().toISOString(),
      is_read: isRead,
      order_id: item.order_id || item.orderId || null,
      report_id: item.report_id || item.reportId || null,
      dotColor: isRead ? 'bg-transparent' : 'bg-primary'
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
    if (!item) return 'Notifications.html';
    const pathname = window.location?.pathname || '';
    const role = (window.Auth?.getCurrentUser?.()?.role || '').toLowerCase();
    
    const inManagerDir = pathname.includes('/managers/');
    const inTechDir = pathname.includes('/technicians/');
    const inUserDir = pathname.includes('/users/');

    const isManager = inManagerDir || role === 'manager';
    const isTechnician = inTechDir || role === 'technician';

    let prefix = '';
    if (isManager && !inManagerDir) prefix = '../managers/';
    else if (isTechnician && !inTechDir) prefix = '../technicians/';
    else if (!isManager && !isTechnician && !inUserDir) prefix = '../users/';

    if (isManager) {
      if (item.report_id) return `${prefix}PendingRequestDetail.html?id=${item.report_id}`;
      if (item.order_id) return `${prefix}WorkOrderDetails.html?id=${item.order_id}`;
      return `${prefix}PendingRequest.html`;
    }

    if (isTechnician) {
      if (item.order_id) return `${prefix}WorkOrderDetails.html?id=${item.order_id}`;
      return `${prefix}AssignedTasks.html`;
    }

    // User Role
    if (item.report_id) return `${prefix}ReportDetails.html?id=${item.report_id}`;
    return `${prefix}ListReports.html`;
  }

  function extractNotificationArray(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.notifications)) return data.notifications;
    return [];
  }

  async function refreshBadge(customCount) {
    let unreadCount = 0;
    if (typeof customCount === 'number') {
      unreadCount = customCount;
    } else if (window.Api) {
      try {
        const res = await Api.get('/notifications/unread-count');
        if (res && res.unreadCount != null) {
          unreadCount = Number(res.unreadCount) || 0;
        }
      } catch (e) {
        console.warn('refreshBadge: failed to fetch unread count', e.message);
      }
    }

    const badge = document.getElementById('notificationBadge');
    if (badge) {
      badge.classList.toggle('hidden', unreadCount === 0);
      if (unreadCount > 0) {
        badge.classList.add('animate-pulse');
      } else {
        badge.classList.remove('animate-pulse');
      }
    }

    const countPill = document.getElementById('notificationUnreadCount');
    if (countPill) {
      countPill.textContent = unreadCount;
      countPill.classList.toggle('hidden', unreadCount === 0);
    }
  }

  async function markAllAsRead(container = null, isDropdown = true) {
    try {
      if (window.Api) {
        await Api.patch('/notifications/read-all');
      }
    } catch (e) {
      console.warn('Failed to mark all notifications read via API', e);
    }

    refreshBadge(0);
    if (container) {
      await loadDropdown();
    }
  }

  async function markNotificationAsRead(id, targetItem = null) {
    if (!id) return;
    try {
      if (window.Api) {
        await Api.patch(`/notifications/${id}/read`);
      }
    } catch (err) {
      console.warn(`Failed to mark notification #${id} as read`, err);
    }
    refreshBadge();
  }

  function renderList(items, container, isDropdown = true) {
    if (!container) return;
    const sorted = sortNotifications(items || []).map(normalizeNotification);
    const listToRender = isDropdown ? sorted.slice(0, 5) : sorted;

    if (listToRender.length === 0) {
      container.innerHTML = `<p class="p-6 text-center text-on-surface-variant text-body-sm">No notifications yet</p>`;
      return;
    }

    container.innerHTML = listToRender
      .map(
        (n) => `
      <div class="notif-card p-4 ${n.is_read ? 'bg-white' : 'bg-primary-fixed/20'} border-b border-outline-variant/10 flex gap-3 cursor-pointer hover:${
          n.is_read ? 'bg-surface-container-low' : 'bg-primary-fixed/30'
        } transition-colors"
           data-id="${n.notification_id}">
        <div class="w-2 h-2 mt-2 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-primary'} shrink-0"></div>
        <div class="flex flex-col gap-1 flex-1">
          <p class="text-body-sm ${n.is_read ? 'font-medium' : 'font-bold'} text-on-surface">${n.title}</p>
          <p class="text-label-md text-on-surface-variant line-clamp-2">${n.message}</p>
          <p class="text-[10px] text-outline mt-1">${timeAgo(n.created_at)}</p>
        </div>
      </div>`
      )
      .join('');

    container.querySelectorAll('.notif-card').forEach((el) => {
      el.addEventListener('click', async () => {
        const id = el.dataset.id;
        const targetItem = sorted.find((n) => String(n.notification_id) === String(id));
        if (targetItem && !targetItem.is_read) {
          await markNotificationAsRead(id, targetItem);
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
    console.log('Container exists?', Boolean(container));
    if (!container) {
      console.error('Notification container (#notificationList) not found in DOM!');
      return;
    }

    console.log('Fetching notifications...');
    let items = [];
    try {
      if (window.Api) {
        const rawData = await Api.get('/notifications', { limit: 5 });
        console.log('Response data:', rawData);
        items = extractNotificationArray(rawData);
      }
    } catch (e) {
      console.error('Failed to load notifications from API:', e);
      items = [];
    }

    console.log('Current count:', items.length);
    renderList(items, container, true);
    refreshBadge();
  }

  async function loadFullList(containerSelector = null, options = {}) {
    const container = containerSelector ? document.querySelector(containerSelector) : null;
    const { page = 1, limit = 50 } = options;

    let items = [];
    try {
      if (window.Api) {
        const rawData = await Api.get('/notifications', { page, limit });
        items = extractNotificationArray(rawData);
      }
    } catch (e) {
      console.warn('loadFullList: failed to load notifications', e.message);
      items = [];
    }

    const normalized = sortNotifications(items).map(normalizeNotification);
    if (container) {
      renderList(items, container, false);
    }
    return normalized;
  }

  function startPolling() {
    refreshBadge();
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      loadDropdown();
    }
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      refreshBadge();
      const dropdown = document.getElementById('notificationDropdown');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        loadDropdown();
      }
    }, 30000);
  }

  return {
    loadDropdown,
    loadFullList,
    startPolling,
    refreshBadge,
    markAllAsRead,
    markNotificationAsRead,
    timeAgo,
    resolveNotificationTarget,
    normalizeNotification,
    deriveTitleAndMessage,
  };
})();

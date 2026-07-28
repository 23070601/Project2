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

  function getLocalReadIds() {
    try {
      return JSON.parse(localStorage.getItem('vnuis_read_notif_ids') || '[]');
    } catch {
      return [];
    }
  }

  function saveLocalReadId(id) {
    if (!id) return;
    const readIds = getLocalReadIds();
    const strId = String(id);
    if (!readIds.includes(strId)) {
      readIds.push(strId);
      localStorage.setItem('vnuis_read_notif_ids', JSON.stringify(readIds));
    }
  }

  function setAllLocalRead() {
    localStorage.setItem('vnuis_all_notifs_read', 'true');
  }

  function isReadLocally(id) {
    if (localStorage.getItem('vnuis_all_notifs_read') === 'true') return true;
    if (!id) return false;
    const strId = String(id);
    const readIds = getLocalReadIds();
    return readIds.includes(strId) || readIds.includes(`notif-${strId}`);
  }

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
    if (!item) return {};
    const id = item.notification_id || item.id || Math.random();
    const isRead = isReadLocally(id) || Boolean(item.is_read || item.isRead);

    return {
      notification_id: id,
      title: item.title || 'Notification',
      message: item.message || item.content || 'System notification',
      created_at: item.created_at || new Date().toISOString(),
      is_read: isRead,
      order_id: item.order_id || item.orderId || null,
      report_id: item.report_id || item.reportId || null,
      dotColor: item.dotColor || (isRead ? 'bg-amber-600' : 'bg-primary')
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

  let lastChimeTime = 0;
  function playUrgentAudioChime() {
    if (Date.now() - lastChimeTime < 10000) return;
    lastChimeTime = Date.now();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  async function refreshBadge(customItems) {
    let unreadCount = 0;

    if (localStorage.getItem('vnuis_all_notifs_read') === 'true') {
      unreadCount = 0;
    } else {
      const rawItems = customItems || SAMPLE_ITEMS;
      const normalizedItems = (rawItems || []).map(normalizeNotification);
      unreadCount = normalizedItems.filter((n) => !n.is_read).length;

      if (window.Api) {
        try {
          const res = await Api.get('/notifications/unread-count');
          if (res && typeof res.unreadCount === 'number') {
            unreadCount = res.unreadCount;
          } else if (typeof res === 'number') {
            unreadCount = res;
          }
        } catch (e) {
          // fallback to normalized unread count
        }
      }
    }

    const badge = document.getElementById('notificationBadge');
    if (badge) {
      badge.classList.toggle('hidden', unreadCount === 0);
      if (unreadCount > 0) {
        badge.classList.add('animate-pulse');
        playUrgentAudioChime();
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

  async function markAllAsRead(items, container, isDropdown = true) {
    setAllLocalRead();

    const currentItems = Array.isArray(items) ? items : SAMPLE_ITEMS;
    currentItems.forEach(n => {
      n.is_read = true;
      if (n.notification_id) saveLocalReadId(n.notification_id);
    });

    try {
      if (window.Api) {
        await Api.patch('/notifications/read-all');
      }
    } catch (e) {}

    if (container) {
      renderList(currentItems, container, isDropdown);
    }
    refreshBadge(currentItems);
  }

  async function markNotificationAsRead(id, items, container, isDropdown = true) {
    if (!id) return;
    saveLocalReadId(id);

    const currentItems = Array.isArray(items) ? items : SAMPLE_ITEMS;
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
    const rawItems = (items && items.length > 0) ? items : SAMPLE_ITEMS;
    const latestItems = sortNotifications(rawItems).map(normalizeNotification);
    const listToRender = isDropdown ? latestItems.slice(0, 3) : latestItems;
    if (!container) return;

    if (listToRender.length === 0) {
      container.innerHTML = `<p class="p-6 text-center text-on-surface-variant text-body-sm">No notifications yet</p>`;
      return;
    }

    container.innerHTML = listToRender
      .map((n) => `
      <div class="notif-card p-4 ${n.is_read ? 'bg-white' : 'bg-primary-fixed/20'} border-b border-outline-variant/10 flex gap-3 cursor-pointer hover:${n.is_read ? 'bg-surface-container-low' : 'bg-primary-fixed/30'} transition-colors"
           data-id="${n.notification_id}">
        <div class="w-2 h-2 mt-2 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-primary'} shrink-0"></div>
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
        const targetItem = latestItems.find((n) => String(n.notification_id) === String(id));
        if (targetItem && !targetItem.is_read) {
          await markNotificationAsRead(id, latestItems, container, isDropdown);
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

    let items = SAMPLE_ITEMS;
    try {
      if (window.Api) {
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

  async function loadFullList(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    let items = SAMPLE_ITEMS;
    try {
      if (window.Api) {
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
      await markAllAsRead(SAMPLE_ITEMS, document.getElementById('notificationList'), true);
    });
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

  return { loadDropdown, loadFullList, startPolling, refreshBadge, markAllAsRead, markNotificationAsRead, timeAgo };
})();

/**
 * ui-helpers.js - các hàm render UI dùng lặp lại ở nhiều trang
 * (badge màu theo priority/status, format ngày giờ theo giờ VN, toast notification).
 */
const UiHelpers = (() => {
  const PRIORITY_STYLE = {
    High: 'bg-error-container text-error',
    Medium: 'bg-tertiary-fixed text-tertiary',
    Low: 'bg-secondary-container text-secondary',
  };

  const STATUS_STYLE = {
    'Pending Approval': 'bg-tertiary-fixed text-tertiary',
    Processing: 'bg-blue-50 text-brand-blue',
    Completed: 'bg-green-50 text-green-700',
    Rejected: 'bg-error-container text-error',
    Cancelled: 'bg-surface-container text-on-surface-variant',
    Assigned: 'bg-blue-50 text-brand-blue',
    Received: 'bg-indigo-50 text-indigo-700',
    'In Progress': 'bg-amber-50 text-amber-700',
    Closed: 'bg-surface-container text-on-surface-variant',
    Pending: 'bg-tertiary-fixed text-tertiary',
    Accepted: 'bg-green-50 text-green-700',
  };

  function badge(text, styleMap) {
    const cls = styleMap[text] || 'bg-surface-container text-on-surface-variant';
    return `<span class="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${cls}">${text}</span>`;
  }

  function priorityBadge(priority) {
    return badge(priority, PRIORITY_STYLE);
  }

  function statusBadge(status) {
    return badge(status, STATUS_STYLE);
  }

  function formatDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString.replace(' ', 'T'));
    return date.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  /**
   * Hiển thị thông báo Toast nhỏ ở góc phải màn hình
   * @param {string} message Nguồn thông báo
   * @param {'success'|'error'|'warning'|'info'} type Loại thông báo
   * @param {number} duration Thời gian hiển thị (ms)
   */
  function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'fixed top-20 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-body-sm font-bold transition-all transform duration-300 ${
      type === 'error'
        ? 'bg-red-50 border-red-200 text-red-700'
        : type === 'warning'
        ? 'bg-amber-50 border-amber-200 text-amber-800'
        : type === 'info'
        ? 'bg-blue-50 border-blue-200 text-primary'
        : 'bg-green-50 border-green-200 text-green-800'
    }`;

    const iconName = type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : 'check_circle';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-xl shrink-0">${iconName}</span>
      <span class="flex-1">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-4');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Bind to window for global access
  window.showToast = showToast;

  return { priorityBadge, statusBadge, formatDate, escapeHtml, showToast };
})();

/**
 * ui-helpers.js - các hàm render UI nhỏ dùng lặp lại ở nhiều trang
 * (badge màu theo priority/status, format ngày giờ theo giờ VN).
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

  return { priorityBadge, statusBadge, formatDate, escapeHtml };
})();

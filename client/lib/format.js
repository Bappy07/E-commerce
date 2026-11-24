export const money = (value = 0) => `৳${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;

export const shortDate = (value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'M';

export const badgeTone = (status = '') => ({
  active: 'success', approved: 'success', paid: 'success', delivered: 'success', completed: 'success', visible: 'success',
  pending: 'warning', processing: 'warning', shipped: 'info', draft: 'neutral', rejected: 'danger', cancelled: 'danger',
  failed: 'danger', suspended: 'danger', refunded: 'neutral', archived: 'neutral', hidden: 'neutral',
}[status.toLowerCase()] || 'neutral');

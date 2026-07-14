export function initials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatMoney(amount, currency = 'INR') {
  const symbols = { INR: '₹', USD: '$', EUR: '€' };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
}

export function formatDateBadge(dateStr) {
  const d = new Date(dateStr);
  return {
    month: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
    day: d.getDate()
  };
}

export const CATEGORY_ICONS = {
  general: '🧾',
  food: '🍔',
  groceries: '🛒',
  transport: '🚕',
  rent: '🏠',
  entertainment: '🎬',
  utilities: '💡',
  travel: '✈️',
  shopping: '🛍️',
  medical: '💊'
};

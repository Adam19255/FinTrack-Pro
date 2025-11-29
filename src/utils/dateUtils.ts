export const pad = (n: number) => n.toString().padStart(2, '0');

// Convert ISO (YYYY-MM-DD or full ISO) to DD-MM-YYYY
export const isoToDDMMYYYY = (iso: string): string => {
  if (!iso) return '';
  const datePart = iso.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}-${m}-${y}`;
};

// Convert DD-MM-YYYY to ISO date (YYYY-MM-DD)
export const ddmmyyyyToISO = (ddmmyyyy: string): string => {
  if (!ddmmyyyy) return '';
  const parts = ddmmyyyy.split('-');
  if (parts.length !== 3) return ddmmyyyy;
  const [d, m, y] = parts;
  return `${y}-${m}-${d}`;
};

// Parse either DD-MM-YYYY or ISO YYYY-MM-DD (or full ISO) into Date
export const parseToDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(NaN);
  const ddmmyyyy = /^\d{2}-\d{2}-\d{4}$/;
  const iso = /^\d{4}-\d{2}-\d{2}/;

  if (ddmmyyyy.test(dateStr)) {
    const [d, m, y] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  if (iso.test(dateStr)) {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  return new Date(dateStr);
};

// Format a Date object to DD-MM-YYYY
export const formatDateToDDMMYYYY = (date: Date): string => {
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
};

// Normalize incoming stored date to ISO (YYYY-MM-DD) for use in <input type="date"> values
export const normalizeToISO = (dateStr: string): string => {
  if (!dateStr) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return ddmmyyyyToISO(dateStr);
  // if already ISO-like, return date part
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
  return '';
};

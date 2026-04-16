export function formatAddress(address) {
  if (!address) return '';
  const value = String(address).trim();
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}


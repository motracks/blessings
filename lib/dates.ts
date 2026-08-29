export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Deterministic small integer hash of a string (djb2), used to pick a
// stable "random" item for a given day without needing a server round-trip
// or persisted state — same date always yields the same index.
export function hashStringToIndex(value: string, modulo: number): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash) % modulo;
}

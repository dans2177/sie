const KEY = 'sie-v4-done';

export function loadDone(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return new Set(data.done ?? []);
    }
  } catch {
    // Fall through
  }
  return new Set();
}

export function saveDone(done: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ done: [...done], ts: Date.now() }));
  } catch {
    // Fall through
  }
}

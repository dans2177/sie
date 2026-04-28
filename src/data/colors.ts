const LIGHT = {
  bg: '#f5f7fb',
  panel: '#eef3f9',
  card: '#ffffff',
  border: '#dbe4f1',
  borderHi: '#9bb1cf',
  amber: '#2563eb',
  amberDim: '#1e4fd0',
  amberBg: '#e8efff',
  text: '#0f172a',
  muted: '#1f2937',
  dim: '#64748b',
  ghost: '#94a3b8',
  d1: '#2563eb',
  d2: '#0891b2',
  d3: '#16a34a',
  d4: '#f59e0b',
};

export const C = { ...LIGHT };

export function applyTheme(mode: 'dark' | 'light'): void {
  void mode;
  Object.assign(C, LIGHT);
}

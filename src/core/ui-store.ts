import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UiState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
}

function readTheme(): ThemeMode {
  try {
    const v = localStorage.getItem('theme');
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage unavailable */
  }
  return 'light';
}

/** UI-only state. Server data never lives here. */
export const useUiStore = create<UiState>((set) => ({
  theme: readTheme(),
  sidebarCollapsed: false,
  setTheme: (theme) => {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): 'light' | 'dark' {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}

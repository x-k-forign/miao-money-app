import { create } from "zustand";
import { defaultTheme, themes, type AppTheme } from "@/constants/themes";
import type { ThemeName } from "@/types/models";

interface ThemeState {
  themeName: ThemeName;
  theme: AppTheme;
  setTheme: (themeName: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeName: defaultTheme.name,
  theme: defaultTheme,
  setTheme: (themeName) => set({ themeName, theme: themes[themeName] })
}));

"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "blue";

export const THEME_COLORS: Record<Theme, {
  bg: string; card: string; text: string; subtext: string; border: string; accent: string;
}> = {
  light: { bg: "#ffffff", card: "#f7f7f7", text: "#111827", subtext: "#6b7280", border: "rgba(0,0,0,0.08)",      accent: "#D4AF37" },
  dark:  { bg: "#0a0a0a", card: "#151515", text: "#ffffff", subtext: "rgba(255,255,255,0.45)", border: "rgba(255,255,255,0.1)", accent: "#D4AF37" },
  blue:  { bg: "#071426", card: "#0b1b32", text: "#f1f5f9", subtext: "rgba(241,245,249,0.5)",   border: "rgba(96,165,250,0.25)", accent: "#D4AF37" },
};

type Ctx = { theme: Theme; setTheme: (t: Theme) => void; colors: typeof THEME_COLORS["dark"] };

const ThemeContext = createContext<Ctx>({ theme: "dark", setTheme: () => {}, colors: THEME_COLORS.dark });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("ijebu-theme") as Theme | null;
    if (saved && THEME_COLORS[saved]) setThemeState(saved);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("ijebu-theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors: THEME_COLORS[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
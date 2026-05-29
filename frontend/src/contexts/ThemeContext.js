import React, { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext(null);

/**
 * Cartoonix is dark-only. The theme is permanently locked to "dark" — the
 * light variant and its toggle have been removed by product decision.
 */
export function ThemeProvider({ children }) {
  const theme = "dark";

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("dark");
    html.classList.remove("light");
    try {
      localStorage.setItem("cartoonix_theme", "dark");
    } catch (e) {
      /* ignore */
    }
  }, []);

  // toggleTheme kept as a no-op for backward compatibility with old imports.
  const toggleTheme = () => {};

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export type Theme = "light" | "dark" | "system";

const THEME_KEY = "jyutjyu-theme";
const LIGHT_THEME_COLOR = "#fbf9f4";
const DARK_THEME_COLOR = "#0c0a09";

let listenersBound = false;

const isValidTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark" || value === "system";

export function useTheme() {
  const theme = useState<Theme>("theme", () => "light");
  const isDark = useState<boolean>("isDark", () => false);

  const getSystemPreference = (): boolean => {
    if (import.meta.server) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const resolveIsDark = (activeTheme: Theme): boolean => {
    return activeTheme === "system"
      ? getSystemPreference()
      : activeTheme === "dark";
  };

  const applyTheme = (isDarkMode: boolean, activeTheme: Theme) => {
    if (import.meta.server) return;

    isDark.value = isDarkMode;
    document.documentElement.classList.toggle("dark", isDarkMode);

    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute(
        "content",
        activeTheme === "system" ? "light dark" : activeTheme,
      );
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        isDarkMode ? DARK_THEME_COLOR : LIGHT_THEME_COLOR,
      );
    }
  };

  const readStoredTheme = (): Theme => {
    if (import.meta.server) return "light";
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return isValidTheme(saved) ? saved : "light";
    } catch {
      return "light";
    }
  };

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;

    if (import.meta.client) {
      try {
        localStorage.setItem(THEME_KEY, newTheme);
      } catch {
        // Ignore storage errors when site storage is restricted.
      }
      applyTheme(resolveIsDark(newTheme), newTheme);
    }
  };

  const initTheme = () => {
    if (import.meta.server) return;

    const initialTheme = readStoredTheme();
    theme.value = initialTheme;
    applyTheme(resolveIsDark(initialTheme), initialTheme);

    if (listenersBound) return;
    listenersBound = true;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (event) => {
      if (theme.value === "system") {
        applyTheme(event.matches, "system");
      }
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== THEME_KEY) return;
      const syncedTheme = isValidTheme(event.newValue)
        ? event.newValue
        : "light";
      theme.value = syncedTheme;
      applyTheme(resolveIsDark(syncedTheme), syncedTheme);
    });
  };

  const cycleTheme = () => {
    const cycle: Theme[] = ["light", "dark", "system"];
    const currentIndex = cycle.indexOf(theme.value);
    const nextIndex = (currentIndex + 1) % cycle.length;
    const nextTheme = cycle[nextIndex];
    if (nextTheme) {
      setTheme(nextTheme);
    }
  };

  return {
    theme: readonly(theme),
    isDark: readonly(isDark),
    setTheme,
    initTheme,
    cycleTheme,
  };
}

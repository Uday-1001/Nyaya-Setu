export const VICTIM_THEME_STORAGE_KEY = "victim_theme_mode";

export const readVictimTheme = (): boolean => {
  try {
    const raw = localStorage.getItem(VICTIM_THEME_STORAGE_KEY);
    if (raw === "light") return false;
    if (raw === "dark") return true;
  } catch {
    // Ignore storage failures and use default.
  }
  return true;
};

export const writeVictimTheme = (isDark: boolean) => {
  try {
    localStorage.setItem(VICTIM_THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch {
    // Ignore storage failures.
  }
};

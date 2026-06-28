import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider.js";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolved, toggleLightDark } = useTheme();
  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-[8px] border-[0.5px] border-border bg-transparent text-foreground hover:bg-secondary/40 transition-colors ${className || ""}`}
      style={{
        cursor: 'pointer',
        width: '34px',
        height: '34px',
        padding: 0
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleLightDark}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
export default ThemeToggle;

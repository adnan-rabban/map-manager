import type { ReactNode } from "react";
import { cn } from "../../../lib/utils.js";
import { ThemeToggle } from "./theme-toggle.js";

type AuthSplitLayoutProps = {
  left: ReactNode;
  right: ReactNode;
  className?: string;
  frameClassName?: string;
  leftClassName?: string;
  rightClassName?: string;
};

export function AuthSplitLayout({
  left,
  right,
  className,
  frameClassName,
  leftClassName,
  rightClassName,
}: AuthSplitLayoutProps) {
  return (
    <div
      className={cn(
        "relative flex h-svh w-screen items-center justify-center bg-[#06080c] p-4 text-foreground sm:p-8",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex h-[620px] w-full max-w-[1140px] overflow-hidden rounded-[14px] border-[0.5px] border-border bg-background text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all",
          frameClassName,
        )}
      >
        <ThemeToggle className="absolute top-[14px] right-[14px] z-30" />
        <div
          className={cn(
            "auth-left-column",
            leftClassName,
          )}
        >
          {left}
        </div>
        <div
          className={cn(
            "relative flex flex-1 min-w-[420px] flex-col items-center justify-center p-[28px_24px] overflow-y-auto",
            rightClassName,
          )}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
export default AuthSplitLayout;

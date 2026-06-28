import type { ReactNode, MutableRefObject } from "react";
import { createContext, useContext, useRef } from "react";
import { ParticleField } from "./particle-field.js";
import { AuthSplitLayout } from "./auth-split-layout.js";
import welcomeSrc from "../../../assets/figures/welcome.svg";
import teamSrc from "../../../assets/figures/team.svg";
import clustersSrc from "../../../assets/figures/clusters.svg";

type ImpulseRef = MutableRefObject<number>;
const TypingImpulseContext = createContext<ImpulseRef | null>(null);

export function useAuthTypingImpulse(): ImpulseRef {
  const ctx = useContext(TypingImpulseContext);
  if (!ctx) throw new Error("useAuthTypingImpulse outside <AuthShell>");
  return ctx;
}

type Variant = "welcome" | "request-access" | "onboarding";

const FIGURES: Record<Variant, string> = {
  welcome: "orbit",
  "request-access": teamSrc,
  onboarding: clustersSrc,
};

export function AuthShell({
  children,
  variant = "welcome",
}: {
  children: ReactNode;
  variant?: Variant;
}) {
  const typingImpulseRef = useRef(0);
  const src = FIGURES[variant];
  return (
    <TypingImpulseContext.Provider value={typingImpulseRef}>
      <AuthSplitLayout
        left={
          <>
            <ParticleField
              src={src}
              sampleStep={3}
              threshold={34}
              dotSize={1}
              renderScale={1}
              align="center"
              typingImpulseRef={typingImpulseRef}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(360px 280px at 50% 48%, transparent 38%, var(--background) 90%)",
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-[18px]">
              <div className="pointer-events-auto flex items-center gap-2 font-mono text-[11px] text-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
                <span className="tracking-[0.2em] uppercase">Enterprise GIS Platform</span>
              </div>
              <div className="max-w-[280px]">
                {/* Server Status Nodes */}
                <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.25em] mb-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-1 w-1 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 4px rgba(34,197,94,0.4)' }} />
                    <span>ID-JKT-01 : ONLINE</span>
                    <span className="text-[8px] text-muted-foreground/50 ml-auto">12ms</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-1 w-1 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 4px rgba(34,197,94,0.4)' }} />
                    <span>SG-APAC-02 : ONLINE</span>
                    <span className="text-[8px] text-muted-foreground/50 ml-auto">34ms</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-1 w-1 rounded-full bg-[#f59e0b]" style={{ boxShadow: '0 0 4px rgba(245,158,11,0.4)' }} />
                    <span>US-EAST-03 : DEGRADED</span>
                    <span className="text-[8px] text-muted-foreground/50 ml-auto">187ms</span>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
                  {variant === "request-access" ? "operator access" : variant === "onboarding" ? "database setup" : "secure gateway"}
                </div>
                <p className="mt-2 text-[14px] leading-[1.4] text-foreground/90 font-sans">
                  {variant === "request-access"
                    ? "Limited read-only mode for field operators and technicians."
                    : variant === "onboarding"
                      ? "Configure database connections and geospatial indexing."
                      : "Centralized asset control and geospatial intelligence platform for industrial fleet management."}
                </p>
                <div className="mt-3 flex gap-3 font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
                  <span>Uptime 99.98%</span>
                  <span>·</span>
                  <span>v2.4.1</span>
                  <span>·</span>
                  <span>TLS 1.3</span>
                </div>
              </div>
            </div>
          </>
        }
        right={children}
      />
    </TypingImpulseContext.Provider>
  );
}
export default AuthShell;

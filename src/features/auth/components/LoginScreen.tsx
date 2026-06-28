import React, { useState, useRef } from 'react';
import { useMapStore } from '../../../store/useMapStore.js';
import { notify } from '../../../components/notifications.js';
import { AuthShell, useAuthTypingImpulse } from "./auth-shell.js";
import { 
  bumpParticleTypingImpulse, 
  pulseParticleSubmitImpulse 
} from "./particle-field.js";

const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    {...props}
    className="text-xs text-muted-foreground font-sans lowercase"
  />
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full h-[38px] px-3 bg-secondary/30 border border-border/80 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
  />
);

const Button = ({ loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className="w-full h-10 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:opacity-90 active:scale-[0.985] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
  >
    {loading && (
      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
    )}
    {children}
  </button>
);

const Separator = () => (
  <div className="h-[0.5px] bg-border/80 flex-1" />
);

export const LoginScreen: React.FC = () => {
  return (
    <AuthShell variant="welcome">
      <LoginForm />
    </AuthShell>
  );
};

function LoginForm() {
  const login = useMapStore((state) => state.login);
  const typingImpulse = useAuthTypingImpulse();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting login form with:", username, password);
    if (!username.trim() || !password) {
      setErrorMsg('Harap isi semua kolom login.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    pulseParticleSubmitImpulse(typingImpulse);

    // Mock server connection delay for aesthetics
    setTimeout(() => {
      console.log("Calling store login action...");
      const res = login(username, password);
      console.log("Store login result:", res);
      setIsLoading(false);
      
      if (res.success) {
        notify.show(`Selamat datang kembali, ${username}!`, 'success');
      } else {
        setErrorMsg(res.error || 'Autentikasi gagal.');
        notify.show(res.error || 'Login gagal', 'error');
      }
    }, 850);
  };

  const handleAutofill = (user: string, pass: string) => {
    console.log("Autofill selected for:", user);
    setUsername(user);
    setPassword(pass);
    setErrorMsg(null);
    setIsLoading(true);
    pulseParticleSubmitImpulse(typingImpulse);

    // Automatically submit for premium instant feel
    setTimeout(() => {
      console.log("Performing auto-login for:", user);
      const res = login(user, pass);
      console.log("Auto-login result:", res);
      setIsLoading(false);
      
      if (res.success) {
        notify.show(`Selamat datang kembali, ${user}!`, 'success');
      } else {
        setErrorMsg(res.error || 'Autentikasi gagal.');
        notify.show(res.error || 'Login gagal', 'error');
      }
    }, 600);
  };

  return (
    <div className="w-full max-w-xs px-2 sm:px-0">
      {/* Top Banner on Mobile */}
      <div className="absolute top-6 left-6 flex items-center gap-2 font-mono text-sm lg:hidden text-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
        <span className="tracking-[0.2em] uppercase font-bold text-xs">Enterprise GIS Platform</span>
      </div>

      <div>
        <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
          secure access
        </div>
        <h1 className="mt-2 font-heading text-2xl font-medium leading-tight text-foreground tracking-tight lowercase">
          asset control portal
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          sign in to access the industrial management dashboard.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => bumpParticleTypingImpulse(typingImpulse, e)}
        className="mt-6 flex flex-col gap-3"
      >
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/25 text-red-500 p-2.5 rounded-lg text-xs flex items-center gap-2.5 animate-shake">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">username</Label>
          <Input
            id="username"
            type="text"
            required
            placeholder="you@example.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            autoComplete="username"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">password</Label>
          <Input
            id="password"
            type="password"
            required
            placeholder="password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" loading={isLoading}>
          sign in
        </Button>
        
        <p className="text-center text-[11px] text-muted-foreground mt-1">
          <span className="font-mono border border-border/80 rounded px-1.5 py-0.5 bg-secondary/50">⌘↵</span> to submit
        </p>
      </form>

      {/* Or Separator */}
      <div className="my-5 flex items-center gap-3">
        <Separator />
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
          or
        </span>
        <Separator />
      </div>

      {/* Demo Autofill Buttons */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => handleAutofill('admin', 'admin123')}
          disabled={isLoading}
          className="w-full h-10 border border-border/80 hover:bg-secondary/20 bg-transparent text-foreground font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          continue as admin
        </button>
        <button
          type="button"
          onClick={() => handleAutofill('operator', 'operator123')}
          disabled={isLoading}
          className="w-full h-10 border border-border/80 hover:bg-secondary/20 bg-transparent text-foreground font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          continue as operator
        </button>
      </div>
    </div>
  );
}
export default LoginScreen;

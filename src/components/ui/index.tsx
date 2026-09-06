import React, { useState, useRef, useEffect, createContext, useContext } from "react";

// ─── Button ────────────────────────────────────────────────────────────────────
type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "gold";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:     "bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white shadow-sm",
  secondary:   "bg-[#f3faf4] hover:bg-[#eaf7ee] text-[#0f766e] border border-[#d9e7dd]",
  outline:     "bg-transparent hover:bg-[#f3faf4] text-[#1f2a1f] border border-[#d9e7dd]",
  ghost:       "bg-transparent hover:bg-[#f3faf4] text-[#1f2a1f]",
  destructive: "bg-[#D62828] hover:bg-[#B81D1D] text-white shadow-sm",
  success:     "bg-[#22c55e] hover:bg-[#16a34a] text-white shadow-sm",
  gold:        "bg-[#FACC15] hover:bg-[#EAB308] text-[#1f2a1f] shadow-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm:   "px-3 py-1.5 text-xs gap-1.5",
  md:   "px-4 py-2 text-sm gap-2",
  lg:   "px-6 py-3 text-sm gap-2 min-h-[48px]",
  icon: "p-2",
};

export function Button({ variant = "default", size = "md", loading, disabled, children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-200 cursor-pointer select-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}
      `}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> { children?: React.ReactNode; }

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`bg-white border border-[#D9D9D9] rounded-xl shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}
export function CardHeader({ children, className = "", ...props }: CardProps) {
  return <div className={`p-4 pb-0 ${className}`} {...props}>{children}</div>;
}
export function CardContent({ children, className = "", ...props }: CardProps) {
  return <div className={`p-4 ${className}`} {...props}>{children}</div>;
}
export function CardFooter({ children, className = "", ...props }: CardProps) {
  return <div className={`p-4 pt-0 flex items-center gap-2 ${className}`} {...props}>{children}</div>;
}
export function CardTitle({ children, className = "", ...props }: CardProps) {
  return <h3 className={`text-lg font-bold text-[#2D3142] ${className}`} {...props}>{children}</h3>;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = "default"|"playing"|"won"|"lost"|"waiting"|"gold"|"silver"|"bronze"|"category"|"live";

const badgeStyles: Record<BadgeVariant, string> = {
  default:  "bg-[#f3faf4] text-[#1f2a1f]",
  playing:  "bg-[#0f766e] text-white",
  won:      "bg-[#22c55e] text-white",
  lost:     "bg-[#D62828] text-white",
  waiting:  "bg-[#FACC15] text-[#1f2a1f]",
  gold:     "bg-[#FACC15] text-[#1f2a1f]",
  silver:   "bg-[#C0C0C0] text-white",
  bronze:   "bg-[#CD7F32] text-white",
  category: "bg-[#16a34a]/10 text-[#15803d] border border-[#16a34a]/20",
  live:     "bg-[#D62828] text-white animate-pulse",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeStyles[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm"|"md"|"lg"|"xl";
  online?: boolean;
}
const avatarSize = { sm:"w-7 h-7 text-xs", md:"w-9 h-9 text-sm", lg:"w-12 h-12 text-base", xl:"w-16 h-16 text-xl" };

export function Avatar({ size="md", online, children, className="", ...props }: AvatarProps) {
  return (
    <div className={`relative inline-flex shrink-0 ${className}`} {...props}>
      <div className={`${avatarSize[size]} rounded-full overflow-hidden bg-[#16a34a]/10 flex items-center justify-center font-semibold text-[#15803d]`}>
        {children}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? "bg-[#06A77D]" : "bg-[#A0A0A0]"}`} />
      )}
    </div>
  );
}
export function AvatarImage({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="w-full h-full object-cover" />;
}
export function AvatarFallback({ children }: { children: React.ReactNode }) {
  return <span>{children}</span>;
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ error, label, leftIcon, rightIcon, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-[#2D3142]">{label}</label>}
      <div className="relative flex items-center">
        {leftIcon && <span className="absolute left-3 text-[#A0A0A0]">{leftIcon}</span>}
        <input
          id={inputId}
          className={`
            w-full rounded-lg border text-sm bg-white text-[#2D3142] placeholder:text-[#A0A0A0]
            px-3 py-2 transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-[#D62828]" : "border-[#D9D9D9]"}
            ${leftIcon ? "pl-9" : ""} ${rightIcon ? "pr-9" : ""}
            ${className}
          `}
          {...props}
        />
        {rightIcon && <span className="absolute right-3 text-[#A0A0A0]">{rightIcon}</span>}
      </div>
      {error && <span className="text-xs text-[#D62828]">{error}</span>}
    </div>
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────────
interface ProgressProps { value: number; max?: number; className?: string; color?: string; }

export function Progress({ value, max = 100, className = "", color = "#FF6B35" }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`w-full bg-[#F5F5F5] rounded-full overflow-hidden h-2 ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ─── Separator ────────────────────────────────────────────────────────────────
export function Separator({ className = "", orientation = "horizontal" }: { className?: string; orientation?: "horizontal"|"vertical" }) {
  return (
    <div className={`bg-[#D9D9D9] ${orientation === "vertical" ? "w-px self-stretch" : "h-px w-full"} ${className}`} />
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
interface TabsCtx { active: string; setActive: (v: string) => void; }
const TabsContext = createContext<TabsCtx>({ active: "", setActive: () => {} });

export function Tabs({ defaultValue, children, className = "" }: { defaultValue: string; children: React.ReactNode; className?: string }) {
  const [active, setActive] = useState(defaultValue);
  return <TabsContext.Provider value={{ active, setActive }}><div className={className}>{children}</div></TabsContext.Provider>;
}
export function TabsList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex gap-1 bg-[#F5F5F5] p-1 rounded-lg ${className}`}>{children}</div>;
}
export function TabsTrigger({ value, children, className = "" }: { value: string; children: React.ReactNode; className?: string }) {
  const { active, setActive } = useContext(TabsContext);
  return (
    <button
      onClick={() => setActive(value)}
      className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
        ${active === value ? "bg-white text-[#FF6B35] shadow-sm" : "text-[#A0A0A0] hover:text-[#2D3142]"}
        ${className}`}
    >
      {children}
    </button>
  );
}
export function TabsContent({ value, children, className = "" }: { value: string; children: React.ReactNode; className?: string }) {
  const { active } = useContext(TabsContext);
  if (active !== value) return null;
  return <div className={`animate-fade-in-scale ${className}`}>{children}</div>;
}

// ─── Dialog ───────────────────────────────────────────────────────────────────
interface DialogProps { open: boolean; onClose: () => void; children?: React.ReactNode; }

export function Dialog({ open, onClose, children }: DialogProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-scale">
        {children}
      </div>
    </div>
  );
}
export function DialogHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 pb-0 ${className}`}>{children}</div>;
}
export function DialogTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xl font-bold text-[#2D3142] ${className}`}>{children}</h2>;
}
export function DialogContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
export function DialogFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 pt-0 flex gap-2 justify-end ${className}`}>{children}</div>;
}

// ─── Sheet (mobile drawer) ────────────────────────────────────────────────────
interface SheetProps { open: boolean; onClose: () => void; children?: React.ReactNode; side?: "bottom"|"right"|"left"; }

export function Sheet({ open, onClose, children, side = "right" }: SheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  const slideClass = {
    right:  "right-0 top-0 h-full w-full max-w-sm translate-x-0",
    left:   "left-0 top-0 h-full w-full max-w-sm translate-x-0",
    bottom: "bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh]",
  }[side];
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute bg-white shadow-2xl flex flex-col animate-fade-in-scale ${slideClass}`}>
        {children}
      </div>
    </div>
  );
}
export function SheetHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 border-b border-[#D9D9D9] flex items-center justify-between ${className}`}>{children}</div>;
}
export function SheetTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-[#2D3142]">{children}</h3>;
}
export function SheetContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex-1 overflow-auto ${className}`}>{children}</div>;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
export function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#2D3142] text-white text-xs rounded-md whitespace-nowrap pointer-events-none z-50">
          {label}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// ─── ScrollArea ───────────────────────────────────────────────────────────────
export function ScrollArea({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-auto ${className}`}>{children}</div>;
}

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = "", ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[#2D3142]">{label}</label>}
      <select
        className={`w-full rounded-lg border border-[#D9D9D9] bg-white text-sm text-[#2D3142] px-3 py-2
          focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]
          disabled:opacity-50 ${className}`}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export type ToastType = "success"|"error"|"info"|"warning";
interface ToastItem { id: number; type: ToastType; message: string; }

const ToastContext = createContext<{ toast: (type: ToastType, message: string) => void }>({ toast: () => {} });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let nextId = useRef(0);

  const toast = (type: ToastType, message: string) => {
    const id = ++nextId.current;
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  const colors: Record<ToastType, string> = {
    success: "bg-[#06A77D] text-white",
    error:   "bg-[#D62828] text-white",
    info:    "bg-[#004E89] text-white",
    warning: "bg-[#FF6B35] text-white",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[100] flex flex-col gap-2 max-w-xs w-full">
        {toasts.map(t => (
          <div key={t.id} className={`${colors[t.type]} px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in-up flex items-center gap-2`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── RadioGroup ───────────────────────────────────────────────────────────────
interface RadioGroupProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}
export function RadioGroup({ options, value, onChange, className = "" }: RadioGroupProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {options.map(o => (
        <label key={o.value} className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="radio"
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="accent-[#FF6B35] w-4 h-4"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

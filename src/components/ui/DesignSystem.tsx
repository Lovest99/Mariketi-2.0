import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  ShieldCheck,
  X,
  AlertTriangle,
} from 'lucide-react';
import { BRAND_ASSETS, cn } from '../../lib/utils';
import type { ToastMessage } from '../../context/MariketiContext';

export const MariketiLogo: React.FC<{
  inverted?: boolean;
  compact?: boolean;
  onClick?: () => void;
}> = ({ inverted = false, compact = false, onClick }) => {
  const [imgError, setImgError] = useState(false);

  const content = inverted || compact ? (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      {!imgError ? (
        <img
          src={BRAND_ASSETS.favicon192}
          alt={compact ? 'MARIKETI' : ''}
          aria-hidden={!compact}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-8 w-8 rounded-lg object-contain ring-1 ring-white/15 shrink-0"
        />
      ) : (
        <span className="h-8 w-8 rounded-lg bg-[#F28C28] text-[#05204B] font-display font-extrabold text-sm flex items-center justify-center shrink-0">
          M
        </span>
      )}
      {!compact && (
        <span
          className={cn(
            'font-display text-xl font-extrabold tracking-tight leading-none lowercase',
            inverted ? 'text-white' : 'text-[#05204B]'
          )}
        >
          mariketi
        </span>
      )}
    </span>
  ) : !imgError ? (
    <img
      src={BRAND_ASSETS.webLogo}
      alt="MARIKETI — Verified Livestock Marketplace"
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className="h-8 sm:h-9 w-auto max-w-[180px] sm:max-w-none object-contain select-none shrink-0"
    />
  ) : (
    <span className="font-display text-xl font-extrabold tracking-tight text-[#05204B] lowercase whitespace-nowrap shrink-0">
      mariketi
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="MARIKETI Home"
        className="inline-flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F28C28] rounded"
      >
        {content}
      </button>
    );
  }
  return content;
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#10243A] text-white hover:bg-[#091827] border border-transparent',
    accent:
      'bg-[#F28C28] text-[#091827] font-semibold hover:bg-[#DC7B1B] border border-transparent',
    secondary:
      'bg-white text-[#17212B] border border-[#E5E9ED] hover:bg-[#F4F6F7] hover:border-[#cfd6dd]',
    ghost:
      'bg-transparent text-[#17212B] hover:bg-[#E5E9ED]/60 border border-transparent',
    danger:
      'bg-[#D64B4B] text-white hover:bg-[#bc3c3c] border border-transparent',
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
  };

  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F28C28] disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  className,
  id,
  ...props
}) => {
  const inputId = id || (label ? `inp-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-[#17212B]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={cn(
          'w-full h-10 rounded-md bg-white border border-[#E5E9ED] px-3 text-sm text-[#17212B] placeholder:text-[#697784]/75 transition-colors focus:outline-none focus:border-[#10243A] focus:ring-2 focus:ring-[#10243A]/10 disabled:bg-[#F4F6F7]',
          error && 'border-[#D64B4B] focus:border-[#D64B4B] focus:ring-[#D64B4B]/10',
          className
        )}
      />
      {error ? (
        <p className="text-xs text-[#D64B4B]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[#697784]">{hint}</p>
      ) : null}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  className,
  id,
  children,
  ...props
}) => {
  const selectId = id || (label ? `sel-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-[#17212B]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={cn(
          'w-full h-10 rounded-md bg-white border border-[#E5E9ED] px-3 text-sm text-[#17212B] transition-colors focus:outline-none focus:border-[#10243A] focus:ring-2 focus:ring-[#10243A]/10',
          error && 'border-[#D64B4B]',
          className
        )}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[#D64B4B]">{error}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className,
  id,
  ...props
}) => {
  const areaId = id || (label ? `txt-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={areaId} className="block text-xs font-medium text-[#17212B]">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        {...props}
        className={cn(
          'w-full rounded-md bg-white border border-[#E5E9ED] px-3 py-2.5 text-sm text-[#17212B] placeholder:text-[#697784]/75 transition-colors focus:outline-none focus:border-[#10243A] focus:ring-2 focus:ring-[#10243A]/10',
          error && 'border-[#D64B4B]',
          className
        )}
      />
      {error && <p className="text-xs text-[#D64B4B]">{error}</p>}
    </div>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('bg-white border border-[#E5E9ED] rounded-lg', className)}>
    {children}
  </div>
);

export const StatusLabel: React.FC<{
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  label: string;
  className?: string;
}> = ({ tone, label, className }) => {
  const styles = {
    success: 'text-[#21865B]',
    warning: 'text-[#B27A15]',
    danger: 'text-[#D64B4B]',
    info: 'text-[#245B83]',
    neutral: 'text-[#697784]',
  };
  const Icon =
    tone === 'success'
      ? ShieldCheck
      : tone === 'warning'
      ? Clock
      : tone === 'danger'
      ? AlertCircle
      : Info;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0',
        styles[tone],
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

export const SafeImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}> = ({ src, alt, className, fallbackLabel }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-[#10243A] text-white/80 p-4 text-center',
          className
        )}
        role="img"
        aria-label={alt}
      >
        <ShieldCheck className="w-7 h-7 text-[#F28C28] mb-2" />
        <span className="text-xs font-medium">{fallbackLabel || alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
};

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ open, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091827]/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'w-full bg-white border border-[#E5E9ED] rounded-lg max-h-[90vh] flex flex-col overflow-hidden shadow-xl',
          maxWidth
        )}
      >
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-[#E5E9ED]">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#10243A] leading-snug">{title}</h3>
            {subtitle && <p className="text-xs text-[#697784] mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="h-9 w-9 -mr-1.5 -mt-1 rounded-md flex items-center justify-center text-[#697784] hover:text-[#10243A] hover:bg-[#F4F6F7] focus-visible:outline-2 focus-visible:outline-[#F28C28] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#091827]/55 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white h-full border-l border-[#E5E9ED] flex flex-col shadow-xl">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-[#E5E9ED]">
          <h3 className="text-base font-bold text-[#10243A] truncate">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="h-9 w-9 -mr-1.5 rounded-md flex items-center justify-center text-[#697784] hover:text-[#10243A] hover:bg-[#F4F6F7] focus-visible:outline-2 focus-visible:outline-[#F28C28] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="bg-white border border-[#E5E9ED] rounded-lg px-5 py-9 text-center">
    <p className="text-base font-semibold text-[#10243A]">{title}</p>
    <p className="text-sm text-[#697784] mt-1.5 max-w-md mx-auto leading-relaxed">{description}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="bg-white border border-[#E5E9ED] rounded-lg overflow-hidden animate-pulse"
      >
        <div className="aspect-[4/3] bg-[#E5E9ED]" />
        <div className="p-5 space-y-3">
          <div className="h-3 w-1/3 bg-[#E5E9ED] rounded" />
          <div className="h-5 w-4/5 bg-[#E5E9ED] rounded" />
          <div className="h-4 w-1/2 bg-[#E5E9ED] rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const ToastStack: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-20 lg:bottom-4 right-4 z-[60] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon =
          t.tone === 'success'
            ? CheckCircle2
            : t.tone === 'warning'
            ? AlertTriangle
            : t.tone === 'error'
            ? AlertCircle
            : Info;
        const iconColor =
          t.tone === 'success'
            ? 'text-[#21865B]'
            : t.tone === 'warning'
            ? 'text-[#D99A2B]'
            : t.tone === 'error'
            ? 'text-[#D64B4B]'
            : 'text-[#245B83]';
        return (
          <div
            key={t.id}
            className="pointer-events-auto bg-[#091827] text-white border border-white/10 rounded-lg p-3.5 shadow-lg flex items-start gap-2.5"
          >
            <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', iconColor)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && (
                <p className="text-xs text-white/75 mt-0.5 leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-white/60 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const MetricCell: React.FC<{
  label: string;
  value: string | number;
  detail?: string;
  className?: string;
}> = ({ label, value, detail, className }) => (
  <div className={cn('bg-white border border-[#E5E9ED] rounded-lg p-4 min-w-0', className)}>
    <p className="text-xs font-medium text-[#697784] truncate">{label}</p>
    <p className="mt-1 text-xl sm:text-2xl font-bold text-[#10243A] font-mono tabular-nums tracking-tight truncate">
      {value}
    </p>
    {detail && <p className="mt-0.5 text-[11px] text-[#697784] truncate">{detail}</p>}
  </div>
);

import React from 'react';

export default function LoadingButton({
  loading,
  children,
  loadingText,
  className = '',
  ...props
}: {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} disabled={loading || props.disabled} className={className}>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {loadingText ?? 'Chargement…'}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
'use client';

type PaginationProps = {
  currentPage: number; // 1-indexed
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const clamp = (n: number) => Math.min(totalPages, Math.max(1, n));

  const go = (p: number) => onPageChange(clamp(p));

  // Vis maks 5 sidetall: [..] p-2 p-1 p p+1 p+2 [..]
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  const showFirst = start > 1;
  const showLast = end < totalPages;

  const btnBase = 'px-3 py-2 rounded-md border text-sm font-medium transition hover:opacity-90';
  const btnActive = 'bg-[--deep-sea] text-black border-[--deep-sea]';
  const btnIdle = 'bg-white text-black border-black/40 hover:bg-black/5';
  const btnDisabled = 'opacity-50 cursor-not-allowed';

  return (
    <div className={`flex items-center justify-center gap-2 mt-4 ${className}`}>
      <button
        type="button"
        onClick={() => go(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`${btnBase} ${btnIdle} ${currentPage <= 1 ? btnDisabled : ''}`}
      >
        ← Forrige
      </button>

      {showFirst && (
        <>
          <button type="button" onClick={() => go(1)} className={`${btnBase} ${btnIdle}`}>
            1
          </button>
          <span className="text-sm text-muted px-1">…</span>
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => go(p)}
          className={`${btnBase} ${p === currentPage ? btnActive : btnIdle}`}
        >
          {p}
        </button>
      ))}

      {showLast && (
        <>
          <span className="text-sm text-muted px-1">…</span>
          <button type="button" onClick={() => go(totalPages)} className={`${btnBase} ${btnIdle}`}>
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => go(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`${btnBase} ${btnIdle} ${currentPage >= totalPages ? btnDisabled : ''}`}
      >
        Neste →
      </button>
    </div>
  );
}

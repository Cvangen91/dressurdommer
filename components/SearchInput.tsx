'use client';

type SearchInputProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function SearchInput({
  label,
  placeholder = 'Søk...',
  value,
  onChange,
  className = '',
}: SearchInputProps) {
  return (
    <div className={className}>
      {label && <label className="label mb-1 block">{label}</label>}

      <div className="relative">
        <input
          className="input pr-10"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />

        {value.trim().length > 0 && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Tøm søk"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-sm text-muted hover:bg-black/5"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

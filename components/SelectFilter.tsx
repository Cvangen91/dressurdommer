'use client';

type Option<T extends string> = { value: T; label: string };

type SelectFilterProps<T extends string> = {
  label?: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
};

export default function SelectFilter<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
}: SelectFilterProps<T>) {
  return (
    <div className={className}>
      {label && <label className="label mb-1 block">{label}</label>}

      <select className="input" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchInput({ value, onChange, placeholder = 'חיפוש...', debounceMs = 300 }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedOnChange = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (val: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => onChange(val), debounceMs);
      };
    })(),
    [onChange, debounceMs]
  );

  const handleChange = (val: string) => {
    setLocalValue(val);
    debouncedOnChange(val);
  };

  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="glass-input pr-10"
        dir="rtl"
      />
    </div>
  );
}

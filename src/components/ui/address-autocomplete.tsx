"use client";

import { useState, useEffect, useRef, useCallback, CSSProperties } from "react";

export interface AddressSuggestion {
  displayName: string;
  street: string;
  venueName: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  countryName: string;
  type: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  style?: CSSProperties;
  className?: string;
  countryCode?: string;
  id?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Calle, número...",
  style,
  className,
  countryCode,
  id,
  disabled,
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipFetchRef = useRef(false);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (q.length < 3) { setSuggestions([]); setShowDropdown(false); return; }
      const params = new URLSearchParams({ q });
      if (countryCode) params.set("countrycode", countryCode.toLowerCase());
      try {
        const res = await fetch(`/api/address-lookup?${params}`);
        const data: AddressSuggestion[] = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    },
    [countryCode]
  );

  // Debounce input changes
  useEffect(() => {
    if (skipFetchRef.current) { skipFetchRef.current = false; return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(value), 320);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSelect = (s: AddressSuggestion) => {
    skipFetchRef.current = true;
    onChange(s.street || s.displayName.split(",")[0]);
    onSelect?.(s);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Format secondary line for suggestion
  const secondary = (s: AddressSuggestion) => {
    const parts = [s.city, s.state, s.countryName].filter(Boolean);
    return parts.join(", ");
  };

  // Primary line: venueName first if it adds info, else street
  const primary = (s: AddressSuggestion) => {
    if (s.venueName && s.venueName !== s.street) {
      return s.venueName + (s.street ? ` · ${s.street}` : "");
    }
    return s.street || s.displayName.split(",")[0];
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        style={style}
        className={className}
      />

      {showDropdown && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#FFFFFF",
            border: "1px solid var(--line-1)",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(15,16,18,.12), 0 2px 6px rgba(15,16,18,.06)",
            zIndex: 120,
            overflow: "hidden",
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                padding: "9px 12px",
                background: activeIndex === i ? "var(--bg-subtle)" : "transparent",
                cursor: "pointer",
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--line-1)" : "none",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--ink-1)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {primary(s)}
              </div>
              {secondary(s) && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    marginTop: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {secondary(s)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

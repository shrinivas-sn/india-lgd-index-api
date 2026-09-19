import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export default function CustomSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  loading = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const shellRef = useRef(null);

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  const filteredOptions = normalizedOptions.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (shellRef.current && !shellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={shellRef} className="select-shell">
      {label && (
        <label className="field-label" htmlFor={`select-${label.replace(/\s+/g, '-').toLowerCase()}`}>
          {label}
          {loading ? ' · loading…' : ''}
        </label>
      )}
      <button
        id={label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined}
        type="button"
        className="select-trigger"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? 'select-value' : 'select-value select-placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          color="var(--ink-soft)"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
        />
      </button>

      {isOpen && !disabled && (
        <div className="select-menu">
          <input
            type="text"
            className="select-search"
            placeholder={`Search ${label ? label.toLowerCase() : 'options'}…`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <div className="select-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    className={`select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <span>
                      {opt.label}
                      {opt.sublabel && <span className="select-sublabel">{opt.sublabel}</span>}
                    </span>
                    {isSelected && <Check size={14} color="var(--seal-dark)" />}
                  </div>
                );
              })
            ) : (
              <div className="select-empty">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

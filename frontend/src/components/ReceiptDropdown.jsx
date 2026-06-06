import { useEffect, useRef, useState } from 'react';
import './ReceiptDropdown.css';

function getValue(option) {
  return typeof option === 'string' ? option : option.value;
}

function getLabel(option) {
  return typeof option === 'string' ? option : option.label;
}

export default function ReceiptDropdown({ value, placeholder = 'Choose', options, onChange, rtl = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(option => getValue(option) === value);
  const label = selected ? getLabel(selected) : value || placeholder;

  useEffect(() => {
    function close(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function selectOption(option) {
    onChange(getValue(option));
    setOpen(false);
  }

  return (
    <div ref={ref} className={`receipt-dropdown ${open ? 'open' : ''} ${rtl ? 'rtl' : ''}`}>
      <button
        type="button"
        className="receipt-dropdown-control"
        onClick={() => setOpen(current => !current)}
      >
        {label}
      </button>
      {open && (
        <div className="receipt-dropdown-menu">
          {options.map(option => {
            const optionValue = getValue(option);
            return (
              <button
                key={optionValue}
                type="button"
                className={optionValue === value ? 'selected' : ''}
                onClick={() => selectOption(option)}
              >
                {getLabel(option)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

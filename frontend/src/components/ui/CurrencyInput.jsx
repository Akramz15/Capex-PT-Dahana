import React, { useState, useEffect } from 'react';

export default function CurrencyInput({ 
  value, 
  onChange, 
  className, 
  style, 
  id, 
  disabled, 
  placeholder 
}) {
  const [displayValue, setDisplayValue] = useState('');

  const formatNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';
    // Format dengan pemisah ribuan titik
    const numStr = val.toString().replace(/[^0-9-]/g, '');
    if (numStr === '' || numStr === '-') return numStr;
    
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e) => {
    const el = e.target;
    const cursor = el.selectionStart;
    const val = el.value;
    
    // Hitung berapa banyak titik (pemisah ribuan) sebelum kursor
    let nonDigitsBeforeCursor = 0;
    for (let i = 0; i < cursor; i++) {
      if (val[i] === '.') nonDigitsBeforeCursor++;
    }
    const targetDigits = cursor - nonDigitsBeforeCursor;

    // Hapus semua karakter kecuali angka dan minus
    let rawStr = val.replace(/[^0-9-]/g, '');
    
    // Jika kosong, kirim nilai kosong (atau nol tergantung preferensi, biasanya '')
    if (rawStr === '' || rawStr === '-') {
      onChange({ target: { value: rawStr === '-' ? '-' : '' } });
      setDisplayValue(rawStr);
      return;
    }
    
    const num = parseInt(rawStr, 10);
    if (!isNaN(num)) {
      const formatted = formatNumber(num);
      // Mengirimkan fake event agar kompatibel dengan onChange(e) bawaan form
      onChange({ target: { value: num } });
      setDisplayValue(formatted);

      // Kembalikan posisi kursor dengan mempertimbangkan perubahan titik
      window.requestAnimationFrame(() => {
        let newPos = 0;
        let digitCount = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (digitCount === targetDigits) {
            newPos = i;
            break;
          }
          if (formatted[i] !== '.') {
            digitCount++;
          }
        }
        if (digitCount === targetDigits && newPos === 0 && targetDigits > 0) {
          newPos = formatted.length;
        }
        el.setSelectionRange(newPos, newPos);
      });
    }
  };

  return (
    <input
      type="text"
      id={id}
      className={className}
      style={style}
      value={displayValue}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}

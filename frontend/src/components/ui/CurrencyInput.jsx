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
    // Hapus semua karakter kecuali angka dan minus
    let rawStr = e.target.value.replace(/[^0-9-]/g, '');
    
    // Jika kosong, kirim nilai kosong (atau nol tergantung preferensi, biasanya '')
    if (rawStr === '' || rawStr === '-') {
      onChange({ target: { value: rawStr === '-' ? '-' : '' } });
      setDisplayValue(rawStr);
      return;
    }
    
    const num = parseInt(rawStr, 10);
    if (!isNaN(num)) {
      // Mengirimkan fake event agar kompatibel dengan onChange(e) bawaan form
      onChange({ target: { value: num } });
      setDisplayValue(formatNumber(num));
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

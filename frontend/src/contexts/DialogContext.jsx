import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const DialogContext = createContext();

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

export function DialogProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: 'alert', // 'alert' | 'confirm'
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Batal',
    variant: 'primary', // 'primary' | 'danger' | 'warning' | 'success'
    onConfirm: null,
    onCancel: null,
  });

  const closeDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const alert = useCallback((options) => {
    let title = options.title;
    let message = options.message || options;
    
    if (typeof options === 'string') {
      title = 'Pemberitahuan';
      message = options;
    }

    setDialogState({
      isOpen: true,
      type: 'alert',
      title: title || 'Pemberitahuan',
      message,
      confirmText: options.confirmText || 'OK',
      variant: options.variant || 'primary',
      onConfirm: options.onConfirm || null,
      onCancel: null,
    });
  }, []);

  const confirm = useCallback((options) => {
    setDialogState({
      isOpen: true,
      type: 'confirm',
      title: options.title || 'Konfirmasi',
      message: options.message || 'Apakah Anda yakin?',
      confirmText: options.confirmText || 'Ya',
      cancelText: options.cancelText || 'Batal',
      variant: options.variant || 'primary',
      onConfirm: options.onConfirm || null,
      onCancel: options.onCancel || null,
    });
  }, []);

  const handleConfirm = () => {
    const fn = dialogState.onConfirm;
    closeDialog();
    if (fn) {
      fn();
    }
  };

  const handleCancel = () => {
    const fn = dialogState.onCancel;
    closeDialog();
    if (fn) {
      fn();
    }
  };

  const getIcon = () => {
    switch (dialogState.variant) {
      case 'danger': return <AlertCircle size={28} style={{ color: '#dc2626' }} />;
      case 'warning': return <AlertCircle size={28} style={{ color: '#d97706' }} />;
      case 'success': return <CheckCircle size={28} style={{ color: '#16a34a' }} />;
      default: return <Info size={28} style={{ color: '#4f46e5' }} />;
    }
  };

  const getVariantStyles = () => {
    switch (dialogState.variant) {
      case 'danger': return { bg: '#fee2e2', color: '#dc2626', btn: 'btn-danger' };
      case 'warning': return { bg: '#fef3c7', color: '#d97706', btn: 'btn-warning' };
      case 'success': return { bg: '#dcfce7', color: '#16a34a', btn: 'btn-success' };
      default: return { bg: '#e0e7ff', color: '#4f46e5', btn: 'btn-primary' };
    }
  };

  const styles = getVariantStyles();

  return (
    <DialogContext.Provider value={{ alert, confirm, close: closeDialog }}>
      {children}
      {dialogState.isOpen && (
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={dialogState.type === 'alert' ? closeDialog : undefined}
        >
          <div 
            className="modal-content" 
            style={{
              backgroundColor: 'var(--clr-surface)',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                backgroundColor: styles.bg, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                {getIcon()}
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--clr-text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
                {dialogState.title}
              </h3>
              
              <p style={{ fontSize: '14px', color: 'var(--clr-text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
                {dialogState.message}
              </p>

              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                {dialogState.type === 'confirm' && (
                  <button 
                    onClick={handleCancel}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '10px 0', fontWeight: 500 }}
                  >
                    {dialogState.cancelText}
                  </button>
                )}
                <button 
                  onClick={handleConfirm}
                  className={`btn ${styles.btn}`}
                  style={{ flex: 1, padding: '10px 0', fontWeight: 500 }}
                >
                  {dialogState.confirmText}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

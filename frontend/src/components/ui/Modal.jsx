import { useEffect } from 'react'
import { useDialog } from '../../contexts/DialogContext'

export default function Modal({ title, onClose, onSubmit, submitLabel = 'Simpan', submitLoading = false, width, children }) {
  const dialog = useDialog()

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" style={width ? { width, maxWidth: '95vw' } : {}}>
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Tutup modal">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {onSubmit && (
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose} disabled={submitLoading}>Batal</button>
            <button className="btn btn-primary" onClick={() => {
              dialog.confirm({
                title: 'Konfirmasi Simpan',
                message: 'Apakah Anda yakin ingin menyimpan data ini?',
                confirmText: 'Simpan',
                variant: 'primary',
                onConfirm: onSubmit
              });
            }} disabled={submitLoading} id="modal-submit-btn">
              {submitLoading ? 'Menyimpan...' : submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

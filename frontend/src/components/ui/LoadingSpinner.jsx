export default function LoadingSpinner({ message = 'Memuat data...' }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  )
}

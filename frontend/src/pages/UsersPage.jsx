import { useEffect, useState, useCallback } from 'react'
import { listUsers, createUser, updateUser, deleteUser } from '../api/users'
import { useAuthStore } from '../store/authStore'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import { useDialog } from '../contexts/DialogContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { UserPlus, Edit3, Trash2, Key, Eye, ShieldAlert } from 'lucide-react'

const EMPTY_FORM = { id: '', email: '', password: '', full_name: '', role: 'user' }

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user)
  const dialog = useDialog()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listUsers()
      setUsers(res.data)
    } catch (e) {
      console.error(e)
      dialog.alert({
        title: 'Gagal Memuat Data',
        message: e.response?.data?.detail || 'Gagal mengambil daftar pengguna.',
        variant: 'danger'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setModal('create')
  }

  const openEdit = (user) => {
    setForm({
      id: user.id,
      email: user.email || '',
      password: '', // Kosong secara default jika tidak ingin ubah password
      full_name: user.full_name || '',
      role: user.role || 'user'
    })
    setModal('edit')
  }

  const closeModal = () => {
    setModal(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (modal === 'create') {
      if (!form.email || !form.password || !form.full_name) {
        dialog.alert({ title: 'Input Tidak Lengkap', message: 'Email, password, dan nama lengkap wajib diisi.', variant: 'warning' })
        return
      }
      if (form.password.length < 6) {
        dialog.alert({ title: 'Password Terlalu Pendek', message: 'Password minimal 6 karakter.', variant: 'warning' })
        return
      }
    }

    setSaving(true)
    try {
      if (modal === 'create') {
        await createUser({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role
        })
        dialog.alert({ title: 'Berhasil', message: 'Pengguna baru berhasil ditambahkan.', variant: 'success' })
      } else {
        const payload = {
          full_name: form.full_name,
          role: form.role
        }
        if (form.password.trim()) {
          if (form.password.length < 6) {
            dialog.alert({ title: 'Password Terlalu Pendek', message: 'Password minimal 6 karakter.', variant: 'warning' })
            setSaving(false)
            return
          }
          payload.password = form.password
        }
        await updateUser(form.id, payload)
        dialog.alert({ title: 'Berhasil', message: 'Data pengguna berhasil diperbarui.', variant: 'success' })
      }
      closeModal()
      fetchUsers()
    } catch (e) {
      console.error(e)
      dialog.alert({
        title: 'Gagal Menyimpan',
        message: e.response?.data?.detail || 'Terjadi kesalahan saat menyimpan data pengguna.',
        variant: 'danger'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (user) => {
    if (user.id === currentUser?.id) {
      dialog.alert({
        title: 'Aksi Ditolak',
        message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.',
        variant: 'warning'
      })
      return
    }

    dialog.confirm({
      title: 'Hapus Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun "${user.full_name || user.email}"? Pengguna tidak akan dapat login lagi.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteUser(user.id)
          dialog.alert({ title: 'Terhapus', message: 'Akun pengguna berhasil dihapus.', variant: 'success' })
          fetchUsers()
        } catch (e) {
          console.error(e)
          dialog.alert({
            title: 'Gagal Menghapus',
            message: e.response?.data?.detail || 'Terjadi kesalahan saat menghapus pengguna.',
            variant: 'danger'
          })
        }
      }
    })
  }

  const columns = [
    {
      key: 'full_name',
      label: 'Nama Lengkap',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: row.role === 'admin' ? '#dcfce7' : '#f1f5f9',
            color: row.role === 'admin' ? '#15803d' : '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            fontSize: '0.85rem'
          }}>
            {(val || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#0f172a' }}>{val || '—'}</div>
            {row.id === currentUser?.id && (
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '500' }}>(Akun Anda)</span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (val) => val || '—'
    },
    {
      key: 'role',
      label: 'Peran (Role)',
      render: (val) => val === 'admin' ? (
        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Key size={12} /> Admin
        </span>
      ) : (
        <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#e2e8f0', color: '#334155' }}>
          <Eye size={12} /> Manajemen (View-Only)
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Tanggal Dibuat',
      render: (val) => val ? new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
    },
    {
      key: 'id',
      label: 'Aksi',
      render: (_, row) => {
        const isSelf = row.id === currentUser?.id
        return (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              onClick={() => openEdit(row)}
              title="Edit User"
            >
              <Edit3 size={14} /> Edit
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '4px 8px', fontSize: '0.75rem', opacity: isSelf ? 0.5 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
              onClick={() => handleDelete(row)}
              disabled={isSelf}
              title={isSelf ? "Tidak dapat menghapus akun sendiri" : "Hapus User"}
            >
              <Trash2 size={14} /> Hapus
            </button>
          </div>
        )
      }
    }
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-title">Manajemen User & Hak Akses</h2>
          <p className="page-desc">Kelola akun pengguna, peran Admin (CRUD), serta perizinan pengguna Manajemen (View-Only).</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openCreate} id="btn-tambah-user">
            <UserPlus size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} /> Tambah User Baru
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingSpinner message="Memuat daftar pengguna..." />
        ) : (
          <DataTable
            columns={columns}
            data={users}
            loading={false}
            searchKeys={['full_name', 'email', 'role']}
          />
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'Tambah User Baru' : 'Edit Pengguna'}
          onClose={closeModal}
        >
          <form onSubmit={handleSave}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: '500', marginBottom: '6px', display: 'block' }}>Nama Lengkap *</label>
              <input
                type="text"
                className="form-control"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="misal: Ahmad Hidayat"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: '500', marginBottom: '6px', display: 'block' }}>Alamat Email *</label>
              <input
                type="email"
                className="form-control"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: modal === 'edit' ? '#f8fafc' : 'white' }}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="misal: ahmad@dahana.id"
                disabled={modal === 'edit'}
                required
              />
              {modal === 'edit' && (
                <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Email pengguna tidak dapat diubah setelah terdaftar.</small>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                Password {modal === 'edit' ? '(Opsional - isi jika ingin ganti password)' : '*'}
              </label>
              <input
                type="password"
                className="form-control"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={modal === 'edit' ? 'Biarkan kosong jika tidak diubah' : 'Minimal 6 karakter'}
                minLength={modal === 'create' ? 6 : undefined}
                required={modal === 'create'}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontWeight: '500', marginBottom: '6px', display: 'block' }}>Peran / Akses (Role) *</label>
              <select
                className="form-control"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="user">Manajemen (View-Only - Hanya Lihat Data)</option>
                <option value="admin">Admin (Akses Penuh - Tambah/Edit/Hapus & Export)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : modal === 'create' ? 'Tambah User' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

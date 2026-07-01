import api from './config'

export const getRkapLockStatus = async (tahun) => {
  const response = await api.get(`/settings/rkap-lock/${tahun}`)
  return response.data
}

export const setRkapLockStatus = async (tahun, is_locked) => {
  const response = await api.post(`/settings/rkap-lock/${tahun}`, { is_locked })
  return response.data
}

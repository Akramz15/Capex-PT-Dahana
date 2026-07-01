import client from './client'

export const getRkapLockStatus = async (tahun) => {
  const response = await client.get(`/settings/rkap-lock/${tahun}`)
  return response.data
}

export const setRkapLockStatus = async (tahun, is_locked) => {
  const response = await client.post(`/settings/rkap-lock/${tahun}`, { is_locked })
  return response.data
}

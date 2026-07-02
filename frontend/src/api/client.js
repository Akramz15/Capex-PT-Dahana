import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 30000,
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    // Only auto-logout on 401 for non-blob requests (not during file downloads)
    if (error.response?.status === 401 && error.config?.responseType !== 'blob') {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default client

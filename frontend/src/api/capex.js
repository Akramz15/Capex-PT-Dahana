import client from './client'

export const getDashboardSummary  = (tahun) => client.get('/dashboard/summary',       { params: { tahun } })
export const getMonthlyChart      = (tahun) => client.get('/dashboard/monthly-chart',  { params: { tahun } })
export const getProgressTable     = (tahun) => client.get('/dashboard/progress-table', { params: { tahun } })
export const getDashboardSummaryYtd = (tahun, bulan) => client.get('/dashboard/summary-ytd', { params: { tahun, bulan } })

export const exportDashboardSummaryYtd = (tahun, bulan) => 
  client.get('/dashboard/export-summary-ytd', { 
    params: { tahun, bulan },
    responseType: 'blob'
  })

export const listCapex    = (params = {}) => client.get('/capex',       { params })
export const getCapex     = (id)          => client.get(`/capex/${id}`)
export const exportCapex  = (tahun)       => client.get('/export-capex', { params: { tahun }, responseType: 'blob' })
export const createCapex  = (data)        => client.post('/capex',      data)
export const updateCapex  = (id, data)    => client.put(`/capex/${id}`, data)
export const deleteCapex  = (id)          => client.delete(`/capex/${id}`)

export const listRealization   = (params = {}) => client.get('/realization',       { params })
export const createRealization = (data)        => client.post('/realization',      data)
export const createRealizationBulk = (data)    => client.post('/realization/bulk', data)
export const updateRealization = (id, data)    => client.put(`/realization/${id}`, data)
export const deleteRealization = (id)          => client.delete(`/realization/${id}`)

export const listStatus   = (params = {}) => client.get('/status',       { params })
export const createStatus = (data)        => client.post('/status',      data)
export const updateStatus = (id, data)    => client.put(`/status/${id}`, data)
export const deleteStatus = (id)          => client.delete(`/status/${id}`)

export const listTimeline   = (params = {}) => client.get('/timeline',       { params })
export const createTimeline = (data)        => client.post('/timeline',      data)
export const createTimelineBulk = (data)    => client.post('/timeline/bulk', data)
export const deleteTimeline = (id)          => client.delete(`/timeline/${id}`)

export const listAssets   = (params = {}) => client.get('/assets',       { params })
export const getAsset     = (id)          => client.get(`/assets/${id}`)
export const createAsset  = (data)        => client.post('/assets',      data)
export const updateAsset  = (id, data)    => client.put(`/assets/${id}`, data)
export const deleteAsset  = (id)          => client.delete(`/assets/${id}`)
export const uploadAssetsExcel = (formData) => client.post('/assets/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

export const listLKU   = (params = {}) => client.get('/lku',       { params })
export const createLKU = (data)        => client.post('/lku',      data)
export const updateLKU = (id, data)    => client.put(`/lku/${id}`, data)
export const deleteLKU = (id)          => client.delete(`/lku/${id}`)

export const exportCapex = (tahun) =>
  client.post('/export-capex', null, {
    params: { tahun },
    responseType: 'blob',
  })

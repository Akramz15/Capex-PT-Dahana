import client from './client';

// --- ASET NOMOR ---
export const getAsetNomor = async () => {
  const response = await client.get('/master-aset/nomor');
  return response.data;
};

export const createAsetNomor = async (data) => {
  const response = await client.post('/master-aset/nomor', data);
  return response.data;
};

export const updateAsetNomor = async (id, data) => {
  const response = await client.put(`/master-aset/nomor/${id}`, data);
  return response.data;
};

export const deleteAsetNomor = async (id) => {
  const response = await client.delete(`/master-aset/nomor/${id}`);
  return response.data;
};

// Upload & Export Excel untuk Nomor Aset
export const uploadAsetNomor = async (formData) => {
  const response = await client.post('/master-aset/nomor/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const exportAsetNomor = async () => {
  const response = await client.get('/master-aset/nomor/export', { responseType: 'blob' });
  return response;
};

// --- ASET LAPORAN AKTIVA ---
export const getAsetLaporan = async () => {
  const response = await client.get('/master-aset/laporan');
  return response.data;
};

export const createAsetLaporan = async (data) => {
  const response = await client.post('/master-aset/laporan', data);
  return response.data;
};

export const updateAsetLaporan = async (id, data) => {
  const response = await client.put(`/master-aset/laporan/${id}`, data);
  return response.data;
};

export const deleteAsetLaporan = async (id) => {
  const response = await client.delete(`/master-aset/laporan/${id}`);
  return response.data;
};

// Upload & Export Excel untuk Laporan Aktiva Tetap
export const uploadAsetLaporan = async (formData) => {
  const response = await client.post('/master-aset/laporan/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const exportAsetLaporan = async () => {
  const response = await client.get('/master-aset/laporan/export', { responseType: 'blob' });
  return response;
};

// --- ASET DATA ---
export const getAsetData = async () => {
  const response = await client.get('/master-aset/data');
  return response.data;
};

export const createAsetData = async (data) => {
  const response = await client.post('/master-aset/data', data);
  return response.data;
};

export const updateAsetData = async (id, data) => {
  const response = await client.put(`/master-aset/data/${id}`, data);
  return response.data;
};

export const deleteAsetData = async (id) => {
  const response = await client.delete(`/master-aset/data/${id}`);
  return response.data;
};

// --- DASHBOARD ---
export const getAsetDashboard = async (tahun) => {
  const response = await client.get('/master-aset/dashboard', { 
    params: { tahun }
  });
  return response.data;
};


import apiClient from '../api/client';

export const checkInOffice = async (coords: { latitude: number; longitude: number; accuracy: number }) => {
  const payload = { coordinates: coords };
  return apiClient.post('/attendance/checkin/office', payload);
};

export const getTodayAttendance = async () => {
  return apiClient.get('/attendance/today');
};

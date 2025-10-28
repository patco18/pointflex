import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckIn from './CheckIn';

jest.mock('../services/api', () => ({
  attendanceService: {
    checkInOffice: jest.fn(),
    checkInMission: jest.fn().mockResolvedValue({})
  }
}));

jest.mock('../utils/geolocation', () => ({
  watchPositionUntilAccurate: jest.fn()
}));

beforeEach(() => {
  const { watchPositionUntilAccurate } = require('../utils/geolocation');
  watchPositionUntilAccurate.mockResolvedValue({
    coords: { latitude: 1, longitude: 2, accuracy: 5 }
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('switch to mission tab displays input', () => {
  render(<CheckIn />);
  fireEvent.click(screen.getByText('Pointage Mission'));
  expect(screen.getByLabelText("Numéro d'ordre de mission")).toBeInTheDocument();
});

test('mission checkin calls service', async () => {
  const { attendanceService } = require('../services/api');
  const { watchPositionUntilAccurate } = require('../utils/geolocation');
  watchPositionUntilAccurate.mockResolvedValue({
    coords: { latitude: 1, longitude: 2, accuracy: 5 }
  });

  render(<CheckIn />);
  fireEvent.click(screen.getByText('Pointage Mission'));
  fireEvent.change(screen.getByLabelText("Numéro d'ordre de mission"), { target: { value: 'M1' } });
  fireEvent.click(screen.getByText('Pointer en Mission'));
  await waitFor(() => expect(attendanceService.checkInMission).toHaveBeenCalledWith('M1', { latitude: 1, longitude: 2, accuracy: 5 }));
});

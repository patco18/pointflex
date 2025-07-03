import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckIn from './CheckIn';

jest.mock('../services/api', () => ({
  attendanceService: {
    checkInOffice: jest.fn(),
    checkInMission: jest.fn().mockResolvedValue({})
  }
}));

test('switch to mission tab displays input', () => {
  render(<CheckIn />);
  fireEvent.click(screen.getByText('Pointage Mission'));
  expect(screen.getByLabelText("Numéro d'ordre de mission")).toBeInTheDocument();
});

test('mission checkin calls service', async () => {
  const { attendanceService } = require('../services/api');
  // mock geolocation
  const mockGetCurrentPosition = jest.fn().mockImplementation((success) => {
    success({ coords: { latitude: 1, longitude: 2 } });
  });
  // @ts-ignore
  global.navigator.geolocation = { getCurrentPosition: mockGetCurrentPosition };

  render(<CheckIn />);
  fireEvent.click(screen.getByText('Pointage Mission'));
  fireEvent.change(screen.getByLabelText("Numéro d'ordre de mission"), { target: { value: 'M1' } });
  fireEvent.click(screen.getByText('Pointer en Mission'));
  await waitFor(() => expect(attendanceService.checkInMission).toHaveBeenCalledWith('M1', { latitude: 1, longitude: 2 }));
});

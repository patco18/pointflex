import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckIn from './CheckIn';

jest.mock('../services/api', () => ({
  attendanceService: {
    checkInOffice: jest.fn(),
    checkInMission: jest.fn().mockResolvedValue({}),
    getGeofencingContext: jest.fn().mockResolvedValue({
      data: { context: { offices: [], missions: [], fallback: null } }
    })
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

  const { attendanceService } = require('../services/api');
  attendanceService.getGeofencingContext.mockResolvedValue({
    data: { context: { offices: [], missions: [], fallback: null } }
  });

  Object.defineProperty(global.navigator, 'geolocation', {
    value: {
      watchPosition: jest.fn((success) => {
        success({ coords: { latitude: 1, longitude: 2, accuracy: 5 } });
        return 1;
      }),
      clearWatch: jest.fn()
    },
    configurable: true,
  });
});

afterEach(() => {
  jest.clearAllMocks();
  // @ts-ignore
  delete global.navigator.geolocation;
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

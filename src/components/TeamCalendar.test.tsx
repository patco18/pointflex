import { render, screen, fireEvent } from '@testing-library/react';
import TeamCalendar from './TeamCalendar';
import { calendarService, adminService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../services/api', () => ({
  calendarService: {
    getCalendarEvents: jest.fn(),
    downloadICal: jest.fn()
  },
  adminService: {
    getEmployees: jest.fn()
  }
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

const mockedCalendarService = calendarService as jest.Mocked<typeof calendarService>;
const mockedUseAuth = useAuth as jest.Mock;
const mockedAdminService = adminService as jest.Mocked<typeof adminService>;

beforeEach(() => {
  mockedUseAuth.mockReturnValue({ user: { id: 1 }, isAdmin: false });
  mockedCalendarService.getCalendarEvents.mockResolvedValue({ data: [] });
  mockedCalendarService.downloadICal.mockResolvedValue({ data: new Blob(['a']) });
  mockedAdminService.getEmployees.mockResolvedValue({ data: [] });
});

describe('TeamCalendar iCal export', () => {
  test('renders export iCal button', () => {
    render(<TeamCalendar />);
    expect(screen.getByRole('button', { name: /export ical/i })).toBeInTheDocument();
  });

  test('calls downloadICal on click', () => {
    render(<TeamCalendar />);
    const btn = screen.getByRole('button', { name: /export ical/i });
    fireEvent.click(btn);
    expect(mockedCalendarService.downloadICal).toHaveBeenCalled();
  });
});

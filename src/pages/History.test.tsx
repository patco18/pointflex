import { render, screen, waitFor } from '@testing-library/react';
import History from './History';

jest.mock('../services/api', () => ({
  attendanceService: {
    getAttendance: jest.fn().mockResolvedValue({ data: { records: [] } })
  }
}));

test('renders history page title', async () => {
  render(<History />);
  await waitFor(() => expect(screen.getByText('Historique des pointages')).toBeInTheDocument());
});

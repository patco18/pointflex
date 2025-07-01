import { render, screen } from '@testing-library/react';
import AttendanceChart from './AttendanceChart';

test('renders chart title', () => {
  const data = [{ date: '01/01', present: 1, late: 0, absent: 0 }];
  render(<AttendanceChart data={data} title="Test Chart" />);
  expect(screen.getByText('Test Chart')).toBeInTheDocument();
});

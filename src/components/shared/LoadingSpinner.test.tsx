import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

test('displays optional text', () => {
  render(<LoadingSpinner text="Loading" />);
  expect(screen.getByText('Loading')).toBeInTheDocument();
});

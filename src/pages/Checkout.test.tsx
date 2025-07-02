import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Checkout from './Checkout'

jest.mock('../services/api', () => ({
  attendanceService: {
    checkout: jest.fn().mockResolvedValue({})
  }
}))

test('checkout button calls service', async () => {
  const { attendanceService } = require('../services/api')
  render(<Checkout />)
  fireEvent.click(screen.getByText('Enregistrer ma sortie'))
  await waitFor(() => expect(attendanceService.checkout).toHaveBeenCalled())
})

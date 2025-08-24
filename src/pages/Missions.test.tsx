import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Missions from './Missions'

jest.mock('../services/api', () => ({
  missionService: {
    getMissions: jest.fn().mockResolvedValue({ data: { missions: [
      { id: 1, order_number: 'M1', title: 'Test', start_date: null, end_date: null, status: 'pending' }
    ] } }),
    createMission: jest.fn(),
    respond: jest.fn().mockResolvedValue({})
  },
  adminService: {
    getEmployees: jest.fn().mockResolvedValue({ data: { employees: [] } })
  }
}))

test('accept mission triggers respond', async () => {
  const { missionService } = require('../services/api')
  render(<Missions />)
  const acceptBtn = await screen.findByText('Accepter')
  fireEvent.click(acceptBtn)
  await waitFor(() => expect(missionService.respond).toHaveBeenCalledWith(1, 'accepted'))
})

test('decline mission triggers respond', async () => {
  const { missionService } = require('../services/api')
  render(<Missions />)
  const declineBtn = await screen.findByText('Refuser')
  fireEvent.click(declineBtn)
  await waitFor(() => expect(missionService.respond).toHaveBeenCalledWith(1, 'declined'))
})

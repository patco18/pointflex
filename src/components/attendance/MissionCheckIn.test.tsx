import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MissionCheckIn from './MissionCheckIn'

jest.mock('../../services/api', () => ({
  missionService: {
    getActiveMissions: jest.fn()
  },
  attendanceService: {
    checkInMission: jest.fn()
  }
}))

const mockGeolocation = () => {
  const mockGetCurrentPosition = jest.fn().mockImplementation((success) => {
    success({ coords: { latitude: 1, longitude: 2 } })
  })
  // @ts-ignore
  global.navigator.geolocation = { getCurrentPosition: mockGetCurrentPosition }
}

test('check-in with accepted mission', async () => {
  const { missionService, attendanceService } = require('../../services/api')
  missionService.getActiveMissions.mockResolvedValue({ data: { missions: [
    { id: 1, order_number: 'M1', status: 'accepted' }
  ] } })
  attendanceService.checkInMission.mockResolvedValue({})
  mockGeolocation()

  render(<MissionCheckIn />)
  const select = await screen.findByLabelText('Mission')
  fireEvent.change(select, { target: { value: 'M1' } })
  fireEvent.click(screen.getByText('Pointer en Mission'))
  await waitFor(() => expect(attendanceService.checkInMission).toHaveBeenCalled())
})

test('prevents check-in for non accepted mission', async () => {
  const { missionService, attendanceService } = require('../../services/api')
  missionService.getActiveMissions.mockResolvedValue({ data: { missions: [
    { id: 1, order_number: 'M1', status: 'pending' }
  ] } })
  mockGeolocation()

  render(<MissionCheckIn />)
  const select = await screen.findByLabelText('Mission')
  fireEvent.change(select, { target: { value: 'M1' } })
  fireEvent.click(screen.getByText('Pointer en Mission'))
  await waitFor(() => expect(attendanceService.checkInMission).not.toHaveBeenCalled())
})

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

jest.mock('../../utils/geolocation', () => ({
  watchPositionUntilAccurate: jest.fn()
}))

beforeEach(() => {
  const { watchPositionUntilAccurate } = require('../../utils/geolocation')
  watchPositionUntilAccurate.mockResolvedValue({
    coords: { latitude: 1, longitude: 2, accuracy: 10 }
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

test('check-in with accepted mission', async () => {
  const { missionService, attendanceService } = require('../../services/api')
  const { watchPositionUntilAccurate } = require('../../utils/geolocation')
  missionService.getActiveMissions.mockResolvedValue({ data: { missions: [
    { id: 1, order_number: 'M1', status: 'accepted' }
  ] } })
  attendanceService.checkInMission.mockResolvedValue({})
  watchPositionUntilAccurate.mockResolvedValue({
    coords: { latitude: 1, longitude: 2, accuracy: 10 }
  })

  render(<MissionCheckIn />)
  const select = await screen.findByLabelText('Mission')
  fireEvent.change(select, { target: { value: 'M1' } })
  fireEvent.click(screen.getByText('Pointer en Mission'))
  await waitFor(() => expect(attendanceService.checkInMission).toHaveBeenCalled())
})

test('prevents check-in for non accepted mission', async () => {
  const { missionService, attendanceService } = require('../../services/api')
  const { watchPositionUntilAccurate } = require('../../utils/geolocation')
  missionService.getActiveMissions.mockResolvedValue({ data: { missions: [
    { id: 1, order_number: 'M1', status: 'pending' }
  ] } })
  watchPositionUntilAccurate.mockResolvedValue({
    coords: { latitude: 1, longitude: 2, accuracy: 10 }
  })

  render(<MissionCheckIn />)
  const select = await screen.findByLabelText('Mission')
  fireEvent.change(select, { target: { value: 'M1' } })
  fireEvent.click(screen.getByText('Pointer en Mission'))
  await waitFor(() => expect(attendanceService.checkInMission).not.toHaveBeenCalled())
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MissionCheckIn from './MissionCheckIn'

jest.mock('../../services/api', () => ({
  missionService: {
    getActiveMissions: jest.fn()
  },
  attendanceService: {
    checkInMission: jest.fn(),
    getGeofencingContext: jest.fn().mockResolvedValue({
      data: { context: { offices: [], missions: [], fallback: null } }
    })
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

  const { attendanceService } = require('../../services/api')
  attendanceService.getGeofencingContext.mockResolvedValue({
    data: { context: { offices: [], missions: [], fallback: null } }
  })

  Object.defineProperty(global.navigator, 'geolocation', {
    value: {
      watchPosition: jest.fn((success) => {
        success({ coords: { latitude: 1, longitude: 2, accuracy: 10 } })
        return 1
      }),
      clearWatch: jest.fn()
    },
    configurable: true
  })
})

afterEach(() => {
  jest.clearAllMocks()
  // @ts-ignore
  delete global.navigator.geolocation
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

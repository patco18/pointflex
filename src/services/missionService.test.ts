import { missionService, api } from './api'

describe('missionService.respond', () => {
  it('sends accepted status', async () => {
    const mock = jest.spyOn(api, 'post').mockResolvedValue({} as any)
    await missionService.respond(1, 'accepted')
    expect(mock).toHaveBeenCalledWith('/missions/1/respond', { status: 'accepted' })
    mock.mockRestore()
  })

  it('sends declined status', async () => {
    const mock = jest.spyOn(api, 'post').mockResolvedValue({} as any)
    await missionService.respond(2, 'declined')
    expect(mock).toHaveBeenCalledWith('/missions/2/respond', { status: 'declined' })
    mock.mockRestore()
  })
})


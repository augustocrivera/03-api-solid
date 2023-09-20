import { expect, describe, it, beforeEach, vi, afterEach } from 'vitest'
import { CheckInService } from './check-in'
import { InMemoryCheckInsRepository } from '@/repositories/in-memory/in-memory-check-ins-repository'
import { InMemoryGymsRepository } from '@/repositories/in-memory/in-memory-gyms-repository'
import { Decimal } from '@prisma/client/runtime/library'
import { MaxNumberOfCheckInsError } from './errors/max-number-of-check-ins-error'
import { MaxDistanceError } from './errors/max-distance-error'

let checkInsRepository: InMemoryCheckInsRepository
let gymsRepository: InMemoryGymsRepository
let sut: CheckInService

describe('Check-in Service', () => {
  beforeEach(async () => {
    checkInsRepository = new InMemoryCheckInsRepository()
    gymsRepository = new InMemoryGymsRepository()
    sut = new CheckInService(checkInsRepository, gymsRepository)

    gymsRepository.items.push({
      id: 'gymId-01',
      title: 'farfs birl',
      description: 'testing',
      phone: '',
      latitude: new Decimal(-18.922985500351),
      longitude: new Decimal(-48.26101888271),
    })

    await gymsRepository.create({
      id: 'gymId-01',
      title: 'Farfs gym',
      description: null,
      phone: null,
      latitude: -18.9335921,
      longitude: -48.2320853,
    })

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should be able to check in', async () => {
    vi.setSystemTime(new Date(2022, 0, 20, 8, 0, 0))

    const { checkIn } = await sut.execute({
      gymId: 'gymId-01',
      userId: 'userId-01',
      userLatitude: -18.922985500351725,
      userLongitude: -48.26101888271459,
    })

    console.log(checkIn.created_at)

    expect(checkIn.id).toEqual(expect.any(String))
  })

  it('should not be able to check in twice in the same day', async () => {
    vi.setSystemTime(new Date(2022, 0, 20, 8, 0, 0))

    await sut.execute({
      gymId: 'gymId-01',
      userId: 'userId-01',
      userLatitude: -18.922985500351725,
      userLongitude: -48.26101888271459,
    })

    await expect(() =>
      sut.execute({
        gymId: 'gymId-01',
        userId: 'userId-01',
        userLatitude: -18.922985500351725,
        userLongitude: -48.26101888271459,
      }),
    ).rejects.toBeInstanceOf(MaxNumberOfCheckInsError)
  })

  it('should be able to check in twice on different days', async () => {
    vi.setSystemTime(new Date(2022, 0, 20, 8, 0, 0))

    await sut.execute({
      gymId: 'gymId-01',
      userId: 'userId-01',
      userLatitude: -18.922985500351725,
      userLongitude: -48.26101888271459,
    })

    vi.setSystemTime(new Date(2022, 0, 21, 8, 0, 0))

    const { checkIn } = await sut.execute({
      gymId: 'gymId-01',
      userId: 'userId-01',
      userLatitude: -18.922985500351725,
      userLongitude: -48.26101888271459,
    })

    expect(checkIn.id).toEqual(expect.any(String))
  })

  it('should not be able to check in on distant gym', async () => {
    vi.setSystemTime(new Date(2022, 0, 20, 8, 0, 0))

    gymsRepository.items.push({
      id: 'gymId-02',
      title: 'farfs nao birl',
      description: '',
      phone: '',
      latitude: new Decimal(-18.9335921),
      longitude: new Decimal(-48.2320853),
    })

    await expect(() =>
      sut.execute({
        gymId: 'gymId-02',
        userId: 'userId-01',
        userLatitude: -18.922985500351725,
        userLongitude: -48.26101888271459,
      }),
    ).rejects.toBeInstanceOf(MaxDistanceError)
  })
})

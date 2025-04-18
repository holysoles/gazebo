import {
  QueryClientProvider as QueryClientProviderV5,
  QueryClient as QueryClientV5,
  useQuery as useQueryV5,
} from '@tanstack/react-queryV5'
import { renderHook, waitFor } from '@testing-library/react'
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { type MockInstance } from 'vitest'

import { BranchCoverageMeasurementsQueryOpts } from './BranchCoverageMeasurementsQueryOpts'

const mockBranchMeasurements = {
  owner: {
    repository: {
      __typename: 'Repository',
      coverageAnalytics: {
        measurements: [
          { timestamp: '2023-01-01T00:00:00+00:00', max: 85 },
          { timestamp: '2023-01-02T00:00:00+00:00', max: 80 },
          { timestamp: '2023-01-03T00:00:00+00:00', max: 90 },
          { timestamp: '2023-01-04T00:00:00+00:00', max: 100 },
        ],
      },
    },
  },
}

const mockNotFoundError = {
  owner: {
    isCurrentUserPartOfOrg: true,
    repository: {
      __typename: 'NotFoundError',
      message: 'commit not found',
    },
  },
}

const mockOwnerNotActivatedError = {
  owner: {
    isCurrentUserPartOfOrg: true,
    repository: {
      __typename: 'OwnerNotActivatedError',
      message: 'owner not activated',
    },
  },
}

const mockNullOwner = {
  owner: null,
}

const mockUnsuccessfulParseError = {}

const queryClientV5 = new QueryClientV5({
  defaultOptions: { queries: { retry: false } },
})
const server = setupServer()

const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <QueryClientProviderV5 client={queryClientV5}>
    {children}
  </QueryClientProviderV5>
)

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  queryClientV5.clear()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

interface SetupArgs {
  isNotFoundError?: boolean
  isOwnerNotActivatedError?: boolean
  isUnsuccessfulParseError?: boolean
  isNullOwner?: boolean
}

describe('useBranchCoverageMeasurements', () => {
  function setup({
    isNotFoundError = false,
    isOwnerNotActivatedError = false,
    isUnsuccessfulParseError = false,
    isNullOwner = false,
  }: SetupArgs) {
    server.use(
      graphql.query('GetBranchCoverageMeasurements', () => {
        if (isNotFoundError) {
          return HttpResponse.json({ data: mockNotFoundError })
        } else if (isOwnerNotActivatedError) {
          return HttpResponse.json({ data: mockOwnerNotActivatedError })
        } else if (isUnsuccessfulParseError) {
          return HttpResponse.json({ data: mockUnsuccessfulParseError })
        } else if (isNullOwner) {
          return HttpResponse.json({ data: mockNullOwner })
        } else {
          return HttpResponse.json({ data: mockBranchMeasurements })
        }
      })
    )
  }

  describe('when called', () => {
    describe('returns Repository as the __typename', () => {
      describe('there is valid data', () => {
        it('returns coverage information', async () => {
          setup({})
          const { result } = renderHook(
            () =>
              useQueryV5(
                BranchCoverageMeasurementsQueryOpts({
                  provider: 'gh',
                  owner: 'codecov',
                  repo: 'cool-repo',
                  interval: 'INTERVAL_7_DAY',
                  before: new Date('2023/03/02'),
                  after: new Date('2022/03/02'),
                  branch: 'main',
                })
              ),
            { wrapper }
          )

          const expectedData = {
            measurements: [
              { timestamp: '2023-01-01T00:00:00+00:00', max: 85 },
              { timestamp: '2023-01-02T00:00:00+00:00', max: 80 },
              { timestamp: '2023-01-03T00:00:00+00:00', max: 90 },
              { timestamp: '2023-01-04T00:00:00+00:00', max: 100 },
            ],
          }

          await waitFor(() =>
            expect(result.current.data).toStrictEqual(expectedData)
          )
        })
      })

      describe('owner is returned as null', () => {
        it('returns empty array', async () => {
          setup({ isNullOwner: true })
          const { result } = renderHook(
            () =>
              useQueryV5(
                BranchCoverageMeasurementsQueryOpts({
                  provider: 'gh',
                  owner: 'codecov',
                  repo: 'cool-repo',
                  interval: 'INTERVAL_7_DAY',
                  before: new Date('2023/03/02'),
                  after: new Date('2022/03/02'),
                  branch: 'main',
                })
              ),
            { wrapper }
          )

          await waitFor(() =>
            expect(result.current.data).toStrictEqual({ measurements: [] })
          )
        })
      })
    })
  })

  describe('returns NotFoundError __typename', () => {
    let consoleSpy: MockInstance

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => null)
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('throws a 404', async () => {
      setup({ isNotFoundError: true })
      const { result } = renderHook(
        () =>
          useQueryV5(
            BranchCoverageMeasurementsQueryOpts({
              provider: 'gh',
              owner: 'codecov',
              repo: 'cool-repo',
              interval: 'INTERVAL_7_DAY',
              before: new Date('2023/03/02'),
              after: new Date('2022/03/02'),
              branch: 'main',
            })
          ),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isError).toBeTruthy())
      await waitFor(() =>
        expect(result.current.error).toEqual(
          expect.objectContaining({
            status: 404,
          })
        )
      )
    })
  })

  describe('returns OwnerNotActivatedError __typename', () => {
    let consoleSpy: MockInstance

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => null)
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('throws a 403', async () => {
      setup({ isOwnerNotActivatedError: true })
      const { result } = renderHook(
        () =>
          useQueryV5(
            BranchCoverageMeasurementsQueryOpts({
              provider: 'gh',
              owner: 'codecov',
              repo: 'cool-repo',
              interval: 'INTERVAL_7_DAY',
              before: new Date('2023/03/02'),
              after: new Date('2022/03/02'),
              branch: 'main',
            })
          ),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isError).toBeTruthy())
      await waitFor(() =>
        expect(result.current.error).toEqual(
          expect.objectContaining({
            status: 403,
          })
        )
      )
    })
  })

  describe('unsuccessful parse of zod schema', () => {
    let consoleSpy: MockInstance

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => null)
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('throws a 404', async () => {
      setup({ isUnsuccessfulParseError: true })
      const { result } = renderHook(
        () =>
          useQueryV5(
            BranchCoverageMeasurementsQueryOpts({
              provider: 'gh',
              owner: 'codecov',
              repo: 'cool-repo',
              interval: 'INTERVAL_7_DAY',
              before: new Date('2023/03/02'),
              after: new Date('2022/03/02'),
              branch: 'main',
            })
          ),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isError).toBeTruthy())
      await waitFor(() =>
        expect(result.current.error).toEqual(
          expect.objectContaining({
            dev: 'BranchCoverageMeasurementsQueryOpts - Parsing Error',
            status: 400,
          })
        )
      )
    })
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route } from 'react-router-dom'
import { MockInstance } from 'vitest'

import { MEASUREMENT_INTERVAL } from 'pages/RepoPage/shared/constants'

import { useFlakeAggregates } from './useFlakeAggregates'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/gh/codecov/gazebo']}>
    <Route path="/:provider/:owner/:repo">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Route>
  </MemoryRouter>
)

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  queryClient.clear()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

const mockNotFoundError = {
  owner: {
    repository: {
      __typename: 'NotFoundError',
      message: 'repo not found',
    },
  },
}

const mockIncorrectResponse = {
  owner: {
    repository: {
      invalid: 'invalid',
    },
  },
}

const mockResponse = {
  owner: {
    repository: {
      __typename: 'Repository',
      testAnalytics: {
        flakeAggregates: {
          flakeCount: 10,
          flakeCountPercentChange: 5.0,
          flakeRate: 0.1,
          flakeRatePercentChange: 2.0,
        },
      },
    },
  },
}

describe('useFlakeAggregates', () => {
  function setup({
    isNotFoundError = false,
    isUnsuccessfulParseError = false,
  }) {
    server.use(
      graphql.query('GetFlakeAggregates', () => {
        if (isNotFoundError) {
          return HttpResponse.json({ data: mockNotFoundError })
        } else if (isUnsuccessfulParseError) {
          return HttpResponse.json({ data: mockIncorrectResponse })
        }
        return HttpResponse.json({ data: mockResponse })
      })
    )
  }

  describe('when called with successful res', () => {
    describe('when data is loaded', () => {
      it('returns the data', async () => {
        setup({})
        const { result } = renderHook(
          () =>
            useFlakeAggregates({
              interval: MEASUREMENT_INTERVAL.INTERVAL_1_DAY,
            }),
          {
            wrapper,
          }
        )

        await waitFor(() => result.current.isLoading)
        await waitFor(() => !result.current.isLoading)

        await waitFor(() =>
          expect(result.current.data).toEqual({
            flakeCount: 10,
            flakeCountPercentChange: 5.0,
            flakeRate: 0.1,
            flakeRatePercentChange: 2.0,
          })
        )
      })
    })
  })

  describe('when failed to parse data', () => {
    let consoleSpy: MockInstance
    beforeAll(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterAll(() => {
      consoleSpy.mockRestore()
    })

    it('returns a failed to parse error', async () => {
      setup({ isUnsuccessfulParseError: true })
      const { result } = renderHook(
        () =>
          useFlakeAggregates({ interval: MEASUREMENT_INTERVAL.INTERVAL_1_DAY }),
        {
          wrapper,
        }
      )

      await waitFor(() =>
        expect(result.current.error).toEqual(
          expect.objectContaining({
            dev: 'useFlakeAggregates - Parsing Error',
            status: 400,
          })
        )
      )
    })
  })

  describe('when data not found', () => {
    let consoleSpy: MockInstance
    beforeAll(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterAll(() => {
      consoleSpy.mockRestore()
    })

    it('returns a not found error', async () => {
      setup({ isNotFoundError: true })
      const { result } = renderHook(
        () =>
          useFlakeAggregates({ interval: MEASUREMENT_INTERVAL.INTERVAL_1_DAY }),
        {
          wrapper,
        }
      )

      await waitFor(() =>
        expect(result.current.error).toEqual(
          expect.objectContaining({
            dev: 'useFlakeAggregates - Not Found Error',
            status: 404,
          })
        )
      )
    })
  })
})

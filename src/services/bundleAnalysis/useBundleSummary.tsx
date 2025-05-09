import {
  queryOptions as queryOptionsV5,
  useSuspenseQuery as useSuspenseQueryV5,
} from '@tanstack/react-queryV5'
import { z } from 'zod'

import { MissingHeadReportSchema } from 'services/comparison/schemas/MissingHeadReport'
import { useRepoOverview } from 'services/repo'
import { RepoNotFoundErrorSchema } from 'services/repo/schemas/RepoNotFoundError'
import { RepoOwnerNotActivatedErrorSchema } from 'services/repo/schemas/RepoOwnerNotActivatedError'
import Api from 'shared/api/api'
import { rejectNetworkError } from 'shared/api/rejectNetworkError'
import A from 'ui/A'

const BundleDataSchema = z.object({
  loadTime: z.object({
    threeG: z.number(),
    highSpeed: z.number(),
  }),
  size: z.object({
    gzip: z.number(),
    uncompress: z.number(),
  }),
})

const BundleAnalysisReportSchema = z.object({
  __typename: z.literal('BundleAnalysisReport'),
  bundle: z
    .object({
      name: z.string(),
      moduleCount: z.number(),
      bundleData: BundleDataSchema,
    })
    .nullable(),
})

const BundleReportSchema = z.discriminatedUnion('__typename', [
  BundleAnalysisReportSchema,
  MissingHeadReportSchema,
])

const RepositorySchema = z.object({
  __typename: z.literal('Repository'),
  branch: z
    .object({
      head: z
        .object({
          bundleAnalysis: z
            .object({
              bundleAnalysisReport: BundleReportSchema.nullable(),
            })
            .nullable(),
        })
        .nullable(),
    })
    .nullable(),
})

const RequestSchema = z.object({
  owner: z
    .object({
      repository: z
        .discriminatedUnion('__typename', [
          RepositorySchema,
          RepoNotFoundErrorSchema,
          RepoOwnerNotActivatedErrorSchema,
        ])
        .nullable(),
    })
    .nullable(),
})

const query = `
query BundleSummary(
  $owner: String!
  $repo: String!
  $branch: String!
  $bundle: String!
  $filters: BundleAnalysisReportFilters
) {
  owner(username: $owner) {
    repository(name: $repo) {
      __typename
      ... on Repository {
        branch(name: $branch) {
          head {
            bundleAnalysis {
              bundleAnalysisReport {
                __typename
                ... on BundleAnalysisReport {
                  bundle(name: $bundle, filters: $filters) {
                    name
                    moduleCount
                    bundleData {
                      loadTime {
                        threeG
                        highSpeed
                      }
                      size {
                        gzip
                        uncompress
                      }
                    }
                  }
                }
                ... on MissingHeadReport {
                  message
                }
              }
            }
          }
        }
      }
      ... on NotFoundError {
        message
      }
      ... on OwnerNotActivatedError {
        message
      }
    }
  }
}`

interface BundleSummaryQueryOptsArgs {
  provider: string
  owner: string
  repo: string
  branch: string | null | undefined
  bundle: string
  filters?: {
    reportGroups?: string[]
    loadTypes?: string[]
  }
}

export const BundleSummaryQueryOpts = ({
  provider,
  owner,
  repo,
  branch,
  bundle,
  filters,
}: BundleSummaryQueryOptsArgs) =>
  queryOptionsV5({
    queryKey: ['BundleSummary', provider, owner, repo, branch, bundle, filters],
    queryFn: ({ signal }) =>
      Api.graphql({
        provider,
        query,
        signal,
        variables: { owner, repo, branch, bundle, filters },
      }).then((res) => {
        const callingFn = 'BundleSummaryQueryOpts'
        const parsedData = RequestSchema.safeParse(res?.data)

        if (!parsedData.success) {
          return rejectNetworkError({
            errorName: 'Parsing Error',
            errorDetails: { callingFn, error: parsedData.error },
          })
        }

        const data = parsedData.data

        if (data?.owner?.repository?.__typename === 'NotFoundError') {
          return rejectNetworkError({
            errorName: 'Not Found Error',
            errorDetails: { callingFn },
          })
        }

        if (data?.owner?.repository?.__typename === 'OwnerNotActivatedError') {
          return rejectNetworkError({
            errorName: 'Owner Not Activated',
            errorDetails: { callingFn },
            data: {
              detail: (
                <p>
                  Activation is required to view this repo, please{' '}
                  {/* @ts-expect-error - A hasn't been typed yet */}
                  <A to={{ pageName: 'membersTab' }}>click here </A> to activate
                  your account.
                </p>
              ),
            },
          })
        }

        let bundleSummary = null
        if (
          data?.owner?.repository?.branch?.head?.bundleAnalysis
            ?.bundleAnalysisReport?.__typename === 'BundleAnalysisReport'
        ) {
          bundleSummary =
            data.owner.repository.branch.head.bundleAnalysis
              .bundleAnalysisReport.bundle
        }

        return { bundleSummary }
      }),
  })

interface UseBundleSummaryArgs {
  provider: string
  owner: string
  repo: string
  branch?: string
  bundle: string
  filters?: {
    reportGroups?: string[]
    loadTypes?: string[]
  }
}

export const useBundleSummary = ({
  provider,
  owner,
  repo,
  branch: branchParam,
  bundle,
  filters = {},
}: UseBundleSummaryArgs) => {
  const { data: overview } = useRepoOverview({
    provider,
    owner,
    repo,
    opts: {
      enabled: !branchParam,
    },
  })

  const branch = branchParam ?? overview?.defaultBranch

  return useSuspenseQueryV5(
    BundleSummaryQueryOpts({
      provider,
      owner,
      repo,
      branch,
      bundle,
      filters,
    })
  )
}

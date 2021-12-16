import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import groupBy from 'lodash/groupBy'
import countBy from 'lodash/countBy'

import { useCommit } from 'services/commit'

function humanReadableOverview(state, count) {
  const plural = (count) => (count > 1 ? 'are' : 'is')
  if (state === 'ERROR') return 'errored'
  if (state === 'UPLOADED') return `${plural(count)} pending`
  if (state === 'PROCESSED') return 'successful'
}

export function useUploads() {
  const { provider, owner, repo, commit } = useParams()
  const {
    data: {
      commit: { uploads },
    },
  } = useCommit({
    provider,
    owner,
    repo,
    commitid: commit,
  })

  const [sortedUploads, setSortedUploads] = useState([])
  const [uploadProviderList, setUploadProviderList] = useState([])
  const [uploadOverview, setUploadOverview] = useState('')

  useEffect(() => {
    setSortedUploads(groupBy(uploads, 'provider'))
  }, [uploads])

  useEffect(() => {
    setUploadProviderList(Object.keys(sortedUploads))
  }, [uploads, sortedUploads])

  useEffect(() => {
    const countedStates = countBy(uploads, (upload) => upload.state)
    const string = Object.entries(countedStates)
      .map(
        ([state, count]) => `${count} ${humanReadableOverview(state, count)}`
      )
      .join(', ')
    setUploadOverview(string)
  }, [uploads, uploadProviderList])

  return {
    uploadOverview,
    sortedUploads,
    uploadProviderList,
    isUploads: !uploads || uploads.length === 0,
  }
}

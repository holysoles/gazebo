import PropTypes from 'prop-types'
import { useParams } from 'react-router-dom'

import NotFound from 'pages/NotFound'
import { useOwner } from 'services/user'
import { ActiveContext } from 'shared/context'
import ListRepo from 'shared/ListRepo'

import Header from './Header'
import Tabs from './Tabs'

function OwnerPage({ repoDisplay = '' }) {
  const { owner, provider } = useParams()
  const { data: ownerData } = useOwner({ username: owner })

  if (!ownerData) {
    return <NotFound />
  }

  return (
    <div className="flex flex-col gap-4">
      <Header owner={ownerData} provider={provider} />
      <div>
        {ownerData?.isCurrentUserPartOfOrg && (
          <Tabs owner={ownerData} provider={provider} />
        )}
        <ActiveContext.Provider value={repoDisplay}>
          <ListRepo
            canRefetch={ownerData.isCurrentUserPartOfOrg}
            owner={ownerData.username}
          />
        </ActiveContext.Provider>
      </div>
    </div>
  )
}

OwnerPage.propTypes = {
  repoDisplay: PropTypes.string.isRequired,
}

export default OwnerPage

import PropTypes from 'prop-types'
import { useHistory, useParams } from 'react-router-dom'

import LogoSpinner from 'old_ui/LogoSpinner'
import { useUser } from 'services/user'
import { ActiveContext } from 'shared/context'
import ListRepo from 'shared/ListRepo'

import Header from './Header'
import Tabs from './Tabs'

function HomePage({ repoDisplay = '' }) {
  const { push } = useHistory()
  const { provider } = useParams()
  const { data: currentUser, isLoading } = useUser({
    onSuccess: (data) => {
      if (!data) {
        push(`/login/${provider}`)
      }
    },
    suspense: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center mt-16">
        <LogoSpinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Header />
      <div>
        <ActiveContext.Provider value={repoDisplay}>
          <Tabs currentUsername={currentUser?.user?.username} />
          <ListRepo canRefetch />
        </ActiveContext.Provider>
      </div>
    </div>
  )
}

HomePage.propTypes = {
  repoDisplay: PropTypes.string.isRequired,
}

export default HomePage

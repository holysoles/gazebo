import { Suspense } from 'react'
import { useParams, Switch, Route } from 'react-router-dom'

import { useBaseUrl } from 'shared/router'
import LogoSpinner from 'components/LogoSpinner'
import ErrorBoundary from 'components/ErrorBoundary'

import SideMenu from './SideMenu'
import AdminTab from './tabs/Admin'
import BillingAndUsersTab from './tabs/BillingAndUsers'
import YAMLTab from './tabs/YAML'
import CancelPlanTab from './tabs/CancelPlan'

function AccountSettings() {
  const { provider, owner } = useParams()
  const baseUrl = useBaseUrl()

  // it's a slightly different menu / pages if the owner is a Org or a user
  // so we will need to fetch the information at this level
  // and render different UI according to the type of user

  return (
    <div className="flex space-between">
      <div className="mr-8">
        <SideMenu baseUrl={baseUrl} />
      </div>
      <div className="flex-grow">
        {/* TODO: Move ErrorBoundary to page layouts. */}
        <ErrorBoundary errorComponent={<p>Opps. Looks like we hit a snag.</p>}>
          <Suspense fallback={<LogoSpinner />}>
            <Switch>
              <Route path={baseUrl + ''} exact>
                <BillingAndUsersTab provider={provider} owner={owner} />
              </Route>
              <Route path={baseUrl + 'billing/cancel'}>
                <CancelPlanTab provider={provider} owner={owner} />
              </Route>
              <Route path={baseUrl + 'yaml'}>
                <YAMLTab />
              </Route>
              <Route path={baseUrl + 'admin'}>
                <AdminTab />
              </Route>
            </Switch>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default AccountSettings

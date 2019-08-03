import * as R from 'ramda'
import React from 'react'
import AdminStore from '../stores/admin-store'
import AuthStore from '../stores/auth-store'
import AdminTarget from './admin-target'
import { createUseBdux } from 'bdux'

const requireAceEditor = () => {
  try {
    require('brace')
    require('brace/mode/json')
    require('brace/theme/xcode')
    return require('react-ace').default
  } catch (e) {
    return null
  }
}

const mapTargets = R.pipe(
  R.mapObjIndexed,
  R.values
)

const renderTarget = R.curry((auth, target, name) => (
  <AdminTarget
    auth={auth}
    key={name}
    target={target}
  />
))

const renderTargets = ({ targets, auth }) => (
  !!(targets && requireAceEditor())
    && mapTargets(renderTarget(auth), targets)
)

const renderMessage = () => (
  !requireAceEditor() && 'Please npm install react-ace'
)

const useBudx = createUseBdux({
  targets: AdminStore,
  auth: AuthStore,
})

export const Admin = (props) => {
  const { state } = useBudx(props)
  return (
    <>
      {renderMessage()}
      {renderTargets(state)}
    </>
  )
}

export default Admin

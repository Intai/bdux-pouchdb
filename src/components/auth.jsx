import * as R from 'ramda'
import React, { useMemo, useCallback } from 'react'
import * as AuthAction from '../actions/auth-action'
import AuthStore from '../stores/auth-store'
import { createUseBdux } from 'bdux'

const retryAuth = (auth) => {
  if (auth.error && auth.retry) {
    return auth.retry(R.assocPath(['options', 'auth'], auth))
  }
}

const getValue = (propName) => R.pipe(
  R.propOr('', propName),
  R.defaultTo('')
)

const isSignedIn = (auth) => (
  auth && auth.isSignedIn === true
)

const handleSubmit = (action) => () => {
  action.retry()
  action.signIn()
}

const renderSignOut = (signOut) => (
  <button
    onClick={signOut}
    type="button"
  >
    Sign out
  </button>
)

const getErrorMessage = R.pathOr(
  '', ['error', 'message']
)

const renderError = (auth) => (
  <div>
    {getErrorMessage(auth)}
  </div>
)

const renderForm = (auth, action) => (
  <form onSubmit={handleSubmit(action)}>
    {renderError(auth)}
    <input
      name="username"
      onChange={action.setUsername}
      type="text"
      value={getValue('username')(auth)}
    />
    <input
      name="password"
      onChange={action.setPassword}
      type="password"
      value={getValue('password')(auth)}
    />
    <button type="submit">
      Continue
    </button>
  </form>
)

const userBdux = createUseBdux({
  auth: AuthStore
})

const Auth = (props) => {
  const { state, dispatch, bindToDispatch } = userBdux(props)
  const { auth } = state
  const signIn = useMemo(() => bindToDispatch(AuthAction.signIn), [bindToDispatch])
  const signOut = useMemo(() => bindToDispatch(AuthAction.signOut), [bindToDispatch])
  const setUsername = useCallback((e) => dispatch(AuthAction.setUsername(e.target.value)), [dispatch])
  const setPassword = useCallback((e) => dispatch(AuthAction.setPassword(e.target.value)), [dispatch])
  const retry = useCallback(() => dispatch(retryAuth(auth)), [auth, dispatch])

  return isSignedIn(auth)
    ? renderSignOut(signOut)
    : renderForm(auth, {
      signIn,
      setUsername,
      setPassword,
      retry,
    })
}

export default Auth

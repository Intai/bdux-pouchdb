import * as R from 'ramda'
import React from 'react'
import * as AuthAction from '../actions/auth-action'
import AuthStore from '../stores/auth-store'
import { pureRender } from './decorators/pure-render'
import { createComponent } from 'bdux'

const setUsername = (e) => (
  AuthAction.setUsername(e.target.value)
)

const setPassword = (e) => (
  AuthAction.setPassword(e.target.value)
)

const getValue = (propName) => R.pipe(
  R.propOr('', propName),
  R.defaultTo('')
)

const isSignedIn = ({ auth }) => (
  auth && auth.isSignedIn === true
)

const handleSubmit = ({ dispatch, auth }) => () => {
  if (auth.error && auth.retry) {
    dispatch(auth.retry(
      R.assocPath(['options', 'auth'], auth)
    ))
  }
  dispatch(AuthAction.signIn())
}

const renderSignOut = ({ bindToDispatch }) => (
  <button
    onClick={bindToDispatch(AuthAction.signOut)}
    type="button"
  >
    Sign out
  </button>
)

const renderForm = (props) => {
  const { bindToDispatch, auth } = props
  return (
    <form onSubmit={handleSubmit(props)}>
      <input
        name="username"
        onChange={bindToDispatch(setUsername)}
        type="text"
        value={getValue('username')(auth)}
      />
      <input
        name="password"
        onChange={bindToDispatch(setPassword)}
        type="password"
        value={getValue('password')(auth)}
      />
      <button type="submit">
        Continue
      </button>
    </form>
  )
}

const Auth = R.ifElse(
  isSignedIn,
  renderSignOut,
  renderForm
)

const decorate = R.pipe(
  pureRender,
  createComponent(
    {
      auth: AuthStore
    }
  )
)

export default decorate(Auth)

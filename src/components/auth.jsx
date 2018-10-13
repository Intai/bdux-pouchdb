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

const Auth = ({ bindToDispatch, auth }) => (
  <form>
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
      Sign in
    </button>
  </form>
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

import * as R from 'ramda'
import Bacon from 'baconjs'
import ActionTypes from '../actions/action-types'
import StoreNames from '../stores/store-names'
import { createStore } from 'bdux'

const isAction = R.pathEq(
  ['action', 'type']
)

const mergeProp = (propName) => R.converge(
  R.assocPath(['state', propName]), [
    R.path(['action', propName]),
    R.identity
  ]
)

const setUsername = R.when(
  isAction(ActionTypes.SET_USERNAME),
  mergeProp('username')
)

const setPassword = R.when(
  isAction(ActionTypes.SET_PASSWORD),
  mergeProp('password')
)

const signIn = R.when(
  isAction(ActionTypes.SIGN_IN),
  R.assocPath(['state', 'isSignedIn'], true)
)

const signOut = R.when(
  isAction(ActionTypes.SIGN_OUT),
  R.over(
    R.lensProp('state'),
    R.flip(R.merge)({
      isSignedIn: false,
      username: '',
      password: ''
    })
  )
)

const unauthorise = R.when(
  isAction(ActionTypes.UNAUTHORISE),
  R.over(
    R.lensProp('state'),
    R.flip(R.merge)({
      isSignedIn: false,
      error: 'unauthorized'
    })
  )
)

export const getReducer = () => {
  const reducerStream = new Bacon.Bus()

  return {
    input: reducerStream,
    output: reducerStream
      .map(setUsername)
      .map(setPassword)
      .map(signIn)
      .map(signOut)
      .map(unauthorise)
      .map(R.prop('state'))
  }
}

export default createStore(
  StoreNames.AUTH, getReducer
)

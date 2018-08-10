import * as R from 'ramda'
import Bacon from 'baconjs'
import ActionTypes from '../actions/action-types'
import StoreNames from '../stores/store-names'
import { createStore } from 'bdux'

const isAction = R.pathEq(
  ['action', 'type']
)

const isAdminUpdate = isAction(
  ActionTypes.POUCHDB_ADMIN
)

const hasConfigSrc = R.path(
  ['action', 'update', 'config', 'src']
)

const accumByConfigSrc = (args) => {
  const { action: { update } } = args
  return R.assocPath(['state', update.config.src], update, args)
}

const updateForAdmin = R.when(
  R.both(isAdminUpdate, hasConfigSrc),
  accumByConfigSrc
)

const getOutputStream = (reducerStream) => (
  reducerStream
    .map(updateForAdmin)
    .map(R.prop('state'))
)

export const getReducer = () => {
  const reducerStream = new Bacon.Bus()

  return {
    input: reducerStream,
    output: getOutputStream(reducerStream)
  }
}

export default createStore(
  StoreNames.ADMIN, getReducer
)

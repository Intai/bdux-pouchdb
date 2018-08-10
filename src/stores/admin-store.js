import * as R from 'ramda'
import Bacon from 'baconjs'
import ActionTypes from '../actions/action-types'
import StoreNames from '../stores/store-names'
import { createStore } from 'bdux'

const isAction = R.pathEq(
  ['action', 'type']
)

const isAdminUpdate = isAction(
  ActionTypes.POUCHDB_UPDATE
)

const hasName = R.path(
  ['action', 'admin', 'name']
)

const accumByName = (args) => {
  const { action: { admin } } = args
  return R.assocPath(['state', admin.name], admin, args)
}

const updateForAdmin = R.when(
  R.both(isAdminUpdate, hasName),
  accumByName
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

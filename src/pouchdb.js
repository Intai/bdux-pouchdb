import * as R from 'ramda'
import Bacon from 'baconjs'
import ActionTypes from './actions/action-types'
import PouchDBAction from './actions/pouchdb-action'

const isAction = R.pathEq(
  ['action', 'type']
)

export const isPouchDBUpdate = isAction(
  ActionTypes.POUCHDB_UPDATE
)

const hasPouchState = ({ name, action }) => (
  action.states && R.has(name, action.states)
)

const getPouchState = (args) => {
  const { action, name } = args
  return R.assoc('state', action.states[name], args)
}

const mapPouchUpdate = R.when(
  R.both(isPouchDBUpdate, hasPouchState),
  getPouchState
)

const getPreOutput = (preStream) => (
  preStream
    // handle update action.
    .map(mapPouchUpdate)
)

export const getPreReduce = () => {
  const preStream = new Bacon.Bus()

  // start receiving changes from pouchdb.
  PouchDBAction.start()

  return {
    input: preStream,
    output: getPreOutput(preStream)
  }
}

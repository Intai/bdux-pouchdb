import * as R from 'ramda'
import Bacon from 'baconjs'
import ActionTypes from './actions/action-types'
import PouchDBAction from './actions/pouchdb-action'

const isAction = R.pathEq(
  ['action', 'type']
)

const isUpdate = isAction(
  ActionTypes.POUCHDB_UPDATE
)

const hasPouchState = ({ name, action }) => (
  action.states && name in action.states
)

const getPouchState = (args) => (
  R.assoc('state', args.action.states[args.name], args)
)

const mapPouchUpdate = R.when(
  R.both(isUpdate, hasPouchState),
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

import * as R from 'ramda'
import Bacon from 'baconjs'
import ActionTypes from './actions/action-types'

const isAction = R.pathEq(
  ['action', 'type']
)

export const isPouchDBUpdate = R.either(
  isAction(ActionTypes.POUCHDB_UPDATE),
  isAction(ActionTypes.POUCHDB_PUT)
)

const hasProp = R.ifElse(
  R.flip(R.is(Array)),
  R.useWith(
    R.any, [
      R.has,
      R.identity
    ]
  ),
  R.has
)

const hasPouchState = ({ name, action }) => (
  action.states && hasProp(name, action.states)
)

const mergeAll = R.when(
  R.is(Array),
  R.mergeAll
)

const getPouchState = (args) => {
  const { action, name } = args
  return R.assoc('state', mergeAll(action.states)[name], args)
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

  return {
    input: preStream,
    output: getPreOutput(preStream)
  }
}

import * as R from 'ramda'
import Bacon from 'baconjs'
import PouchDB from 'pouchdb'
import ActionTypes from './action-types'
import Common from '../utils/common-util'
import { config } from '../config'
import { bindToDispatch } from 'bdux'

const initStream = new Bacon.Bus()

const objOf = (name) => (
  (name)
    ? R.objfOf(name)
    : R.identity
)

const getPouchDocs = ({ docs }) => (
  (docs && docs.length === 1)
    ? docs[0] : docs
)

const getPouchStream = (action) => ({ src, target, options = {}, name = '' }) => (
  Bacon.fromCallback((callback) => {
    PouchDB[action](src, target, options)
      .on('change', function (info) {
        callback(info)
      })
  })
  .map(getPouchDocs)
  .map(objOf(name))
)

const getSyncStreams = () => (
  R.map(getPouchStream('sync'), config().sync)
)

const getReplicateStreams = () => (
  R.map(getPouchStream('replicate'), config().replicate)
)

const getChangeStreams = R.converge(
  R.concat, [
    getSyncStreams,
    getReplicateStreams
  ]
)

const getStatesProperty = () => (
  Bacon.mergeAll(getChangeStreams)
    .scan({}, R.merge)
)

const start = () => (
  Bacon.combineTemplate({
    type: ActionTypes.POUCHDB_UPDATE,
    states: getStatesProperty()
      .sampledBy(initStream.debounce(1)),
    skipLog: true
  })
  .changes()
)

const onceThenNull = (func) => {
  let count = 0
  return () => (
    (count++ <= 0)
      ? func()
      : null
  )
}

export const load = () => (
  Bacon.combineTemplate({
    type: ActionTypes.POUCHDB_UPDATE,
    states: Bacon.combineAsArray(getChangeStreams())
      .map(R.mergeAll),
    skipLog: true
  })
  .first()
)

export const init = () => {
  if (Common.isOnClient()) {
    initStream.push(true)
  }
}

export default bindToDispatch({
  start: onceThenNull(start),
  load,
  init
})

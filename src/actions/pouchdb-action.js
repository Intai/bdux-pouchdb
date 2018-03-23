import * as R from 'ramda'
import Bacon from 'baconjs'
import PouchDB from 'pouchdb'
import ActionTypes from './action-types'
import Common from '../utils/common-util'
import { config } from '../config'
import { bindToDispatch } from 'bdux'

const initStream = new Bacon.Bus()

const getAllDocs = ({ rows }) => (
  R.pluck('doc', rows)
)

const fetchAllDocs = (...args) => {
  const db = new PouchDB(...args)
  return db.allDocs({ include_docs: true })
    .then(getAllDocs)
}

const sync = (callback, { src, target, options = {} }) => {
  PouchDB.replicate(target, src)
    .on('complete', () => {
      fetchAllDocs(src)
        .then(callback)

      PouchDB.sync(src, target, options)
        .on('change', ({ direction, change }) => {
          if (direction === 'pull') {
            callback(change.docs)
          }
        })
    })
}

const replicate = (callback, { src, target, options = {} }) => {
  PouchDB.replicate(src, target, options)
    .on('complete', () => {
      fetchAllDocs(target)
        .then(callback)
    })
}

const getPouchStream = (action) => (config) => (
  Bacon.fromCallback((callback) => {
    ((action === 'sync')
      ? sync
      : replicate
    )(callback, config)
  })
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
  Bacon.mergeAll(getChangeStreams())
    .scan({}, R.reduce(R.merge))
)

const start = () => (
  Bacon.combineTemplate({
    type: ActionTypes.POUCHDB_UPDATE,
    states: getStatesProperty(),
    init: initStream.debounce(1),
    skipLog: true
  })
  .map(R.dissoc('init'))
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

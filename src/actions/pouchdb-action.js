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

const handleChange = (sink, name, target) => ({ direction, change }) => {
  if (direction === 'pull' && change.docs_written > 0) {
    if (name) {
      fetchAllDocs(target)
        .then(sink)
    } else {
      sink(change.docs)
    }
  }
}

const handleComplete = (sink, target) => (info) => {
  const endStream = () => sink(new Bacon.End());

  if (info.docs_written > 0) {
    fetchAllDocs(target)
      .then(sink)
      .then(endStream)
  } else {
    endStream()
  }
}

const syncPouchStream = (sink, { name, src, target, options = {} }) => {
  fetchAllDocs(src)
    .then(sink)

  PouchDB.replicate(target, src)
    .on('complete', (info) => {
      if (info.docs_written > 0) {
        fetchAllDocs(src)
          .then(sink)
      }

      PouchDB.sync(src, target, options)
        .on('change', handleChange(sink, name, src))
        .on('complete', handleComplete(sink, src))
    })
}

const replicatePouchStream = (sink, { name, src, target, options = {} }) => {
  fetchAllDocs(target)
    .then(sink)

  PouchDB.replicate(src, target, options)
    .on('change', handleChange(sink, name, target))
    .on('complete', handleComplete(sink, target))
}

const objOf = (name) => (
  (name)
    ? R.pipe(R.objOf(name), R.of)
    : R.identity
)

const getPouchStream = (action) => (config) => (
  Bacon.fromBinder((sink) => {
    ((action === 'sync')
      ? syncPouchStream
      : replicatePouchStream
    )(sink, config)
  })
  .map(objOf(config.name))
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

export const sync = (config) => (
  Bacon.combineTemplate({
    type: ActionTypes.POUCHDB_UPDATE,
    states: getPouchStream('sync')(config)
      .map(R.mergeAll),
    config,
    skipLog: true
  })
)

export const replicate = (config) => (
  Bacon.combineTemplate({
    type: ActionTypes.POUCHDB_UPDATE,
    states: getPouchStream('replicate')(config)
      .map(R.mergeAll),
    config,
    skipLog: true
  })
)

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
  sync,
  replicate,
  init
})

import * as R from 'ramda'
import Bacon from 'baconjs'
import PouchDB from 'pouchdb'
import PouchDBFind from 'pouchdb-find'
import ActionTypes from './action-types'
import Common from '../utils/common-util'

PouchDB.plugin(PouchDBFind)

const initStream = new Bacon.Bus()
const updateStream = new Bacon.Bus()

const isDesignDoc = R.propSatisfies(
  R.test(/^_design\//),
  '_id'
)

const getAllDocs = ({ rows }) => (
  R.pluck('doc', rows)
)

const fetchAllDocs = (db) => (
  db.allDocs({ include_docs: true })
    .then(getAllDocs)
    .then(R.reject(isDesignDoc))
)

const findDocs = (db, find) => (
  db.find(find)
    .then(R.prop('docs'))
)

const indexDocs = (db, createIndex) => (
  db.createIndex(createIndex)
)

const fetchDocs = (name, { createIndex, find }) => {
  const db = new PouchDB(name)

  if (createIndex && find) {
    // index if hasn't and then find with mango query.
    return indexDocs(db, createIndex)
      .then(() => findDocs(db, find))
  } else if (find) {
    // mango query without indexing.
    return findDocs(db, find)
  }
  // get all documents.
  return fetchAllDocs(db)
}

const mapToStore = (to) => (docs) => (
  (to && to.storeName)
    ? R.objOf(to.storeName, docs)
    : R.mergeAll(docs)
)

const sinkDocs = (sink, name, config) => {
  const { to } = config
  return fetchDocs(name, config)
    .then(mapToStore(to))
    .then(sink)
}

const handleChange = (sink, name, config) => ({ direction, change }) => {
  if (direction === 'pull' && change.docs_written > 0) {
    if (config.to && config.to.storeName) {
      return sinkDocs(sink, name, config)
    } else {
      sink(R.mergeAll(
        R.reject(isDesignDoc, change.docs)))
    }
  }
}

const handleComplete = (sink, name, config) => (info) => {
  if (info.docs_written > 0) {
    return sinkDocs(sink, name, config)
  }
}

const fromBinder = (func) => (config) => (
  Bacon.fromBinder((sink) => {
    func(sink, config)
  })
)

const wrapPromise = (...handles) => (create) => (...args) => {
  R.pipe(...handles)(create(...args))
}

const createAsync = (sink) => {
  const promises = []
  const waitFor = (promise) => {
    if (promise) {
      promises.push(promise)
    }
  }

  const endAfter = () => {
    if (promises.length > 0) {
      Promise.all(promises)
        .then(() => sink(new Bacon.End()))
    }
  }

  return {
    waitFor: wrapPromise(waitFor),
    endAfter: wrapPromise(
      waitFor,
      endAfter
    )
  }
}

const getSyncStream = fromBinder((sink, config) => {
  const async = createAsync(sink)
  const { sync } = config
  const { src, target, options = {} } = sync

  async.waitFor(sinkDocs)(sink, src, config)

  PouchDB.replicate(target, src, options)
    .on('complete', (info) => {
      if (info.docs_written > 0) {
        async.waitFor(sinkDocs)(sink, src, config)
      }

      PouchDB.sync(src, target, options)
        .on('change', async.waitFor(handleChange(sink, src, config)))
        .on('complete', async.endAfter(handleComplete(sink, src, config)))
    })
})

const getReplicateStream = fromBinder((sink, config) => {
  const async = createAsync(sink)
  const { replicate } = config
  const { src, target, options = {} } = replicate

  async.waitFor(sinkDocs)(sink, target, config)

  PouchDB.replicate(src, target, options)
    .on('change', async.waitFor(handleChange(sink, target, config)))
    .on('complete', async.endAfter(handleComplete(sink, target, config)))
})

const getChangesStream = fromBinder((sink, config) => {
  const async = createAsync(sink)
  const { changes } = config
  const { name, options = {} } = changes

  PouchDB.changes(options)
    .on('change', async.waitFor(handleChange(sink, name, config)))
    .on('complete', async.endAfter(handleComplete(sink, name, config)))
})

const whenHasProp = (propName, func) => R.ifElse(
  R.prop(propName),
  func,
  R.F
)

const getPouchStreams = R.pipe(
  R.juxt([
    whenHasProp('sync', getSyncStream),
    whenHasProp('replicate', getReplicateStream),
    whenHasProp('changes', getChangesStream)
  ]),
  R.filter(R.identity),
  Bacon.mergeAll
)

const getStatesProperty = () => (
  updateStream
    .flatMap(getPouchStreams)
    .scan({}, R.merge)
)

export const start = () => (
  Bacon.combineTemplate({
    type: ActionTypes.POUCHDB_UPDATE,
    states: getStatesProperty(),
    init: initStream,
    skipLog: true
  })
  .map(R.dissoc('init'))
  .changes()
)

const addConfig = (propName, func) => (config) => {
  if (config[propName]) {
    return func(config)
      .map(R.objOf('data'))
      .map(R.assoc('config', config[propName]))
  }
}

const getPouchStreamsForAdmin = R.pipe(
  R.juxt([
    addConfig('sync', getSyncStream),
    addConfig('replicate', getReplicateStream),
    addConfig('changes', getChangesStream)
  ]),
  R.filter(R.identity),
  Bacon.mergeAll
)

const getAdminStream = () => (
  updateStream
    .flatMap(getPouchStreamsForAdmin)
)

export const startAdmin = () => (
  Bacon.combineTemplate({
    type: ActionTypes.POUCHDB_ADMIN,
    update: getAdminStream(),
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

export const startOnce = onceThenNull(
  start
)

export const startAdminOnce = onceThenNull(
  startAdmin
)

const createConfigChain = () => {
  const chain = {}
  const config = {}
  const updateConfig = (name) => (update) => {
    config[name] = update
    return chain
  }

  return Object.assign(chain, {
    sync: updateConfig('sync'),
    replicate: updateConfig('replicate'),
    changes: updateConfig('changes'),
    createIndex: updateConfig('createIndex'),
    find: updateConfig('find'),
    to: updateConfig('to'),
    create() {
      updateStream.push(config)
    }
  })
}

export const sync = (config) => (
  createConfigChain().sync(config)
)

export const replicate = (config) => (
  createConfigChain().replicate(config)
)

export const changes = (config) => (
  createConfigChain().changes(config)
)

export const init = () => {
  if (Common.isOnClient()) {
    initStream.push(true)
  }
}

export default {
  startAdmin: startAdminOnce,
  sync,
  replicate,
  changes
}

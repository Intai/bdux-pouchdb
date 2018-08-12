import * as R from 'ramda'
import Bacon from 'baconjs'
import PouchDB from 'pouchdb'
import PouchDBFind from 'pouchdb-find'
import ActionTypes from './action-types'

PouchDB.plugin(PouchDBFind)

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

const handleError = (sink, name, config) => (error) => {
  sink(new Bacon.Error({ name, config, error }))
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

  PouchDB.replicate(target, src, { ...options, live: false })
    .on('denied', async.waitFor(handleError(sink, src, config)))
    .on('error', async.endAfter(handleError(sink, src, config)))
    .on('complete', (info) => {
      if (info.docs_written > 0) {
        async.waitFor(sinkDocs)(sink, src, config)
      }

      PouchDB.sync(src, target, options)
        .on('change', async.waitFor(handleChange(sink, src, config)))
        .on('complete', async.endAfter(handleComplete(sink, src, config)))
        .on('denied', async.waitFor(handleError(sink, src, config)))
        .on('error', async.endAfter(handleError(sink, src, config)))
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
    .on('denied', async.waitFor(handleError(sink, target, config)))
    .on('error', async.endAfter(handleError(sink, target, config)))
})

const getChangesStream = fromBinder((sink, config) => {
  const async = createAsync(sink)
  const { changes } = config
  const { name, options = {} } = changes
  const db = new PouchDB(name)

  db.changes(options)
    .on('change', async.waitFor(handleChange(sink, name, config)))
    .on('complete', async.endAfter(handleComplete(sink, name, config)))
    .on('denied', async.waitFor(handleError(sink, name, config)))
    .on('error', async.endAfter(handleError(sink, name, config)))
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

const getStatesProperty = (configStream) => (
  configStream
    .flatMap(getPouchStreams)
    .scan({}, R.merge)
)

const addConfig = (propName, func) => (config) => {
  const args = config[propName]
  if (args) {
    return func(config)
      .map(R.objOf('states'))
      .map(R.assoc('name', args.src || args.name))
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

const getAdminStream = (configStream) => (
  configStream
    .flatMap(getPouchStreamsForAdmin)
)

export const createUpdate = (config) => {
  const configStream = Bacon.once(config)
  return Bacon.combineTemplate({
    type: ActionTypes.POUCHDB_UPDATE,
    states: getStatesProperty(configStream),
    admin: getAdminStream(configStream),
    skipLog: true
  })
}

const mergePutResponse = (doc) => ({ id, rev }) => ({
  ...doc,
  _id: id,
  _rev: rev
})

const putDoc = (db) => (doc) => (
  db[doc._id ? 'put' : 'post'](doc)
    .then(mergePutResponse(doc))
)

const mapDocsP = (func, isDoc) => (states) => {
  if (states._id || isDoc === true) {
    // a single document.
    return func(states)
  } else if (states.length > 0) {
    // array of documents.
    const promises = R.map(mapDocsP(func, true), states)
    return Promise.all(promises)
  } else {
    // object contains documents.
    const pairs = R.toPairs(states)
    const keys = R.pluck(0, pairs)
    const values = R.pluck(1, pairs)
    const promises = R.map(mapDocsP(func), values)
    return Promise.all(promises)
      .then(R.zipObj(keys))
  }
}

const sinkPutUpdate = (sink, name) => (states) => {
  sink({
    type: ActionTypes.POUCHDB_UPDATE,
    states,
    admin: { name, states },
    skipLog: true
  })
  sink(new Bacon.End())
}

const sinkPutError = (sink) => (error) => {
  sink(new Bacon.Error(error))
  sink(new Bacon.End())
}

export const put = ({ name, states, options }) => (
  Bacon.fromBinder((sink) => {
    const db = new PouchDB(name, options)
    mapDocsP(putDoc(db))(states)
      .then(sinkPutUpdate(sink, name))
      .catch(sinkPutError(sink))
  })
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
    create: () => createUpdate(config)
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

export default {
  sync,
  replicate,
  changes
}

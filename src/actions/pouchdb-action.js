import ActionTypes from './action-types'
import { bindToDispatch } from 'bdux'

export const init = () => ({
  type: ActionTypes.POUCHDB_INIT,
  skipLog: true
})

export default bindToDispatch({
  init
})

import * as R from 'ramda'
import Bacon from 'baconjs'
import StoreNames from '../stores/store-names'
import { createStore } from 'bdux'

export const getReducer = () => {
  const reducerStream = new Bacon.Bus()

  return {
    input: reducerStream,
    output: reducerStream
      .map(R.prop('state'))
      .map(R.defaultTo({
        username: 'admin',
        password: 'admin'
      }))
  }
}

export default createStore(
  StoreNames.AUTH, getReducer
)

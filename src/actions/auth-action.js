import ActionTypes from './action-types'

export const setUsername = (username) => ({
  type: ActionTypes.SET_USERNAME,
  username,
})

export const setPassword = (password) => ({
  type: ActionTypes.SET_PASSWORD,
  password,
})

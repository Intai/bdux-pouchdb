import ActionTypes from './action-types'

export const setUsername = (username) => ({
  type: ActionTypes.SET_USERNAME,
  username,
})

export const setPassword = (password) => ({
  type: ActionTypes.SET_PASSWORD,
  password,
})

export const signIn = () => ({
  type: ActionTypes.SIGN_IN,
})

export const signOut = () => ({
  type: ActionTypes.SIGN_OUT,
})

export const unauthorise = () => ({
  type: ActionTypes.UNAUTHORISE,
})

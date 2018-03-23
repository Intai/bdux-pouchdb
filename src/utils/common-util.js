import * as R from 'ramda'

const PREFIX = 'BDUXPD'

export const canUseDOM = () => (
  typeof window !== 'undefined'
    && window.document
    && window.document.createElement
)

export const isReactNative = () => (
  typeof window !== 'undefined'
    && window.navigator
    && window.navigator.product === 'ReactNative'
)

const mapToKeyValue = (obj, key) => {
  obj[key] = PREFIX + '_' + key
  return obj
}

export default {
  isOnClient: R.once(
    R.either(
      canUseDOM,
      isReactNative
    )
  ),

  // map an array of strings to
  // object keys and prefixed values.
  createObjOfConsts: (values) => R.reduce(
    mapToKeyValue, {}, values
  )
}

import * as R from 'ramda'

export const config = (() => {
  let params = {
    sync: [],
    replicate: []
  }

  return (addition) => (
    params = R.is(Object, addition)
      ? R.merge(params, addition)
      : params
  )
})()

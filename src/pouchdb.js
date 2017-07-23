import Bacon from 'baconjs'

export const getPreReduce = () => {
  const preStream = new Bacon.Bus()

  return {
    input: preStream,
    output: preStream
  }
}

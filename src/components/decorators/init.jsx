import R from 'ramda'
import React from 'react'
import PouchDBAction from '../../actions/pouchdb-action'

const getDisplayName = (Component) => (
  Component.displayName || Component.name || 'Component'
)

export const decorateComponent = (Component = R.F) => (
  class extends React.Component {
    static displayName = getDisplayName(Component)
    static defaultProps = {}

    /* istanbul ignore next */
    constructor() {
      super()
    }

    componentDidMount() {
      PouchDBAction.init()
    }

    render() {
      return React.createElement(
        Component, this.props
      )
    }
  }
)

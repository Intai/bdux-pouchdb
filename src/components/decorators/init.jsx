import * as R from 'ramda'
import React from 'react'
import * as PouchDBAction from '../../actions/pouchdb-action'

const getDisplayName = (Component) => (
  Component.displayName || Component.name || 'Component'
)

export const decorateComponent = (Component = R.F) => (
  class extends React.Component {
    static displayName = getDisplayName(Component)
    static defaultProps = {}

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

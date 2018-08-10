import * as R from 'ramda'
import React from 'react'
import * as PouchDBAction from '../actions/pouchdb-action'
import AdminStore from '../stores/admin-store'
import { pureRender } from './decorators/pure-render'
import { createComponent } from 'bdux'

const requireAceEditor = () => {
  try {
    require('brace')
    require('brace/mode/json')
    require('brace/theme/xcode')
    return require('react-ace').default
  } catch (e) {
    return null
  }
}

const renderTarget = ({ data }, src) => {
  const AceEditor = requireAceEditor()
  return (
    <div key={src}>
      {src}
      <AceEditor
        fontSize={14}
        highlightActiveLine
        mode="json"
        setOptions={{ tabSize: 2, wrap: 80 }}
        showGutter={false}
        theme="xcode"
        value={JSON.stringify(data, null, 2)}
      />
    </div>
  )
}

const renderList = R.ifElse(
  R.both(R.identity, requireAceEditor),
  R.pipe(
    R.mapObjIndexed(renderTarget),
    R.values
  ),
  R.F
)

const renderMessage = () => (
  !requireAceEditor() && 'Please npm install react-ace'
)

export const Admin = ({ targets }) => (
  <React.Fragment>
    {renderMessage()}
    {renderList(targets)}
  </React.Fragment>
)

const decorate = R.pipe(
  pureRender,
  createComponent(
    {
      targets: AdminStore
    },
    // start listening to pouchdb updates for admin.
    PouchDBAction.startAdminOnce
  )
)

export default decorate(Admin)

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

const fromMap = R.reduce(
  (accum, [key, value]) => R.assoc(key, value, accum),
  {}
)

const handleEditorBlur = (map) => (e, editor) => {
  const value = editor.getValue()
  map.set('prevStates', map.get('states'))
  map.set('states', value && JSON.parse(value))
}

const handleUpdate = (map, dispatch) => () => {
  dispatch(PouchDBAction.update({
    ...fromMap(map),
    options: {
      auth: {
        username: 'admin',
        password: 'admin'
      }
    }
  }))
}

const renderTarget = ({ dispatch }) => function AdminTarget(target, name) {
  const AceEditor = requireAceEditor()
  const map = new Map(Object.entries(target))

  return (
    <div key={name}>
      {name}
      <AceEditor
        fontSize={14}
        highlightActiveLine
        mode="json"
        onBlur={handleEditorBlur(map)}
        setOptions={{ tabSize: 2, wrap: 80 }}
        showGutter={false}
        theme="xcode"
        value={JSON.stringify(target.states, null, 2)}
      />
      <button
        onClick={handleUpdate(map, dispatch)}
        type="button"
      >
        {'Update'}
      </button>
    </div>
  )
}

const renderTargets = ({ targets, ...props }) => (
  !!(targets && requireAceEditor())
    && R.values(R.mapObjIndexed(renderTarget(props), targets))
)

const renderMessage = () => (
  !requireAceEditor() && 'Please npm install react-ace'
)

export const Admin = (props) => (
  <React.Fragment>
    {renderMessage()}
    {renderTargets(props)}
  </React.Fragment>
)

const decorate = R.pipe(
  pureRender,
  createComponent(
    {
      targets: AdminStore
    }
  )
)

export default decorate(Admin)

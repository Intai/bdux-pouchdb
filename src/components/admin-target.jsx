import * as R from 'ramda'
import React, { useMemo, useCallback } from 'react'
import AceEditor from 'react-ace'
import * as PouchDBAction from '../actions/pouchdb-action'
import { useBudx } from 'bdux'

const fromMap = R.reduce(
  (accum, [key, value]) => R.assoc(key, value, accum),
  {}
)

const createPayload = (auth, target) => (
  new Map(Object.entries({
    ...target,
    prevStates: target.states,
    options: {
      auth
    }
  }))
)

const handleEditorBlur = (payload) => (e, editor) => {
  const value = editor.getValue()
  payload.set('prevStates', payload.get('states'))
  payload.set('states', value && JSON.parse(value))
}

const updatePayload = (payload) => (
  PouchDBAction.update(fromMap(payload))
)

export const AdminTarget = (props) => {
  const { auth, target } = props
  const { dispatch } = useBudx(props)
  const payload = useMemo(() => createPayload(auth, target), [auth, target])
  const update = useCallback(() => dispatch(updatePayload(payload)), [payload, dispatch])
  
  return (
    <div>
      {name}
      <AceEditor
        fontSize={14}
        highlightActiveLine
        mode="json"
        onBlur={handleEditorBlur(payload)}
        setOptions={{ tabSize: 2, wrap: 80 }}
        showGutter={false}
        theme="xcode"
        value={JSON.stringify(target.states, null, 2)}
      />
      <button
        onClick={update}
        type="button"
      >
        {'Update'}
      </button>
    </div>
  )
}

export default React.memo(AdminTarget)

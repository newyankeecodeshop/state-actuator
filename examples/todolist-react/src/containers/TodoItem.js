import React, { useCallback, useRef } from "react";
import useOnClickOutside from "use-onclickoutside";
import { assignTo } from "state-actuator";
import { withActuator } from "state-actuator/lib/react";

import useDoubleClick from "../hooks/useDoubleClick";
import useOnEnter from "../hooks/useOnEnter";

function init() {
  return { editing: false };
}

// --- MESSAGES ----

const SetEditing = (value) => ({ type: "SetEditing", value });

function update(model, msg) {
  switch (msg.type) {
    case "SetEditing":
      return assignTo(model, ["editing", msg.value]);
    default:
      return undefined;
  }
}

function TodoItem({ todo, model, send }) {
  const { editing } = model;

  // These will bubble up to the parent
  const onDelete = () => send.DeleteTodo(todo);
  const onDone = () => send.ToggleDone(todo);
  const onChange = (event) => send.SetLabel(todo, event.target.value);

  const handleViewClick = useDoubleClick(null, () => {
    send(SetEditing(true));
  });
  const finishedCallback = useCallback(() => {
    send(SetEditing(false));
    send.SetLabel(todo, todo.label.trim());
  }, [send, todo]);

  const onEnter = useOnEnter(finishedCallback);
  const ref = useRef();
  useOnClickOutside(ref, finishedCallback);

  return (
    <li
      onClick={handleViewClick}
      className={`${editing ? "editing" : ""} ${todo.done ? "completed" : ""}`}
    >
      <div className="view">
        <input
          type="checkbox"
          className="toggle"
          checked={todo.done}
          onChange={onDone}
          autoFocus={true}
        />
        <label>{todo.label}</label>
        <button className="destroy" onClick={onDelete} />
      </div>
      {editing && (
        <input
          ref={ref}
          className="edit"
          value={todo.label}
          onChange={onChange}
          onKeyPress={onEnter}
          autoFocus={true}
        />
      )}
    </li>
  );
}

export default withActuator(TodoItem, { init, update });

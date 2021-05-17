import React, { useCallback, useRef } from "react";
import useOnClickOutside from "use-onclickoutside";
import { withActuator } from "state-actuator/lib/react";

import useDoubleClick from "../hooks/useDoubleClick";
import useOnEnter from "../hooks/useOnEnter";

function init() {
  return { editing: false };
}

// --- MESSAGES ----

const DeleteTodo = (todo) => ({ id: "DeleteTodo", todo });
const SetEditing = (value) => ({ id: "SetEditing", value });
const SetLabel = (todo, label) => ({ id: "SetLabel", todo, label });
const ToggleDone = (todo) => ({ id: "ToggleDone", todo });

function update(model, msg) {
  switch (msg.id) {
    case "SetEditing":
      return { ...model, editing: msg.value };
  }
}

function TodoItem({ todo, model, updater }) {
  const { editing } = model;

  // These will bubble up to the parent
  const onDelete = () => updater(DeleteTodo(todo));
  const onDone = () => updater(ToggleDone(todo));
  const onChange = (event) => updater(SetLabel(todo, event.target.value));

  const handleViewClick = useDoubleClick(null, () => {
    updater(SetEditing(true));
  });
  const finishedCallback = useCallback(() => {
    updater(SetEditing(false));
    updater(SetLabel(todo, todo.label.trim()));
  }, [updater, todo]);

  const onEnter = useOnEnter(finishedCallback, [todo]);
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
        />
      )}
    </li>
  );
}

export default withActuator(TodoItem, { init, update });

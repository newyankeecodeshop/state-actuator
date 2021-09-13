import React, { useCallback, useMemo } from "react";
import { NavLink } from "react-router-dom";
import useRouter from "use-react-router";
import { Subscription, assignTo } from "state-actuator";
import { withActuator } from "state-actuator/lib/react";

import useInput from "../hooks/useInput";
import useOnEnter from "../hooks/useOnEnter";
import { newTodo } from "../reducers/useTodos";
import TodoItem from "./TodoItem";

function init() {
  return JSON.parse(localStorage.getItem("todos") || "[]");
}

const AddTodo = (label) => ({ type: "AddTodo", label });
const ClearCompleted = () => ({ type: "ClearCompleted" });
const ToggleAllDone = (filter) => ({ type: "ToggleAllDone", filter });

function update(model, msg) {
  switch (msg.type) {
    case "AddTodo":
      return model.concat(newTodo(msg.label));

    case "DeleteTodo":
      return model.filter((todo) => todo !== msg.todo);

    case "ClearCompleted":
      return model.filter((todo) => !todo.done);

    case "SetLabel":
      return model.map((todo) => {
        if (todo === msg.todo) {
          return assignTo(todo, ["label", msg.label]);
        } else {
          return todo;
        }
      });

    case "ToggleDone":
      return model.map((todo) => {
        if (todo === msg.todo) {
          return assignTo(todo, ["done", !todo.done]);
        } else {
          return todo;
        }
      });

    case "ToggleAllDone":
      const visibleTodos = msg.filter
        ? model.filter(({ done }) => (msg.filter === "active" ? !done : done))
        : model;
      const allSelected = visibleTodos.every((todo) => todo.done);

      return model.map((todo) => {
        if (visibleTodos.includes(todo)) {
          return assignTo(todo, ["done", !allSelected]);
        }
        return todo;
      });
  }
}

function subscribe(model) {
  // The model changed so lets save it.
  return Subscription(() => {
    localStorage.setItem("todos", JSON.stringify(model));
  }, [model]);
}

function TodoList({ model, updater }) {
  const router = useRouter();

  const todos = model;

  const left = useMemo(() => todos.reduce((p, c) => p + (c.done ? 0 : 1), 0), [todos]);

  const visibleTodos = useMemo(
    () =>
      router.match.params.filter
        ? todos.filter((i) => (router.match.params.filter === "active" ? !i.done : i.done))
        : todos,
    [todos, router.match.params.filter]
  );

  const anyDone = useMemo(() => todos.some((i) => i.done), [todos]);
  const allSelected = useMemo(() => visibleTodos.every((i) => i.done), [visibleTodos]);

  const onToggleAll = useCallback(() => {
    updater(ToggleAllDone(router.match.params.filter));
  }, [updater, router.match.params]);

  const onClearCompleted = useCallback(() => {
    updater(ClearCompleted());
  }, [updater]);

  const [newValue, onNewValueChange, setNewValue] = useInput();
  const onAddTodo = useOnEnter(() => {
    if (newValue) {
      updater(AddTodo(newValue));
      setNewValue("");
    }
  }, [newValue]);

  return (
    <React.Fragment>
      <header className="header">
        <h1>todos</h1>
        <input
          className="new-todo"
          placeholder="What needs to be done?"
          onKeyPress={onAddTodo}
          value={newValue}
          onChange={onNewValueChange}
        />
      </header>

      <section className="main">
        <input
          id="toggle-all"
          type="checkbox"
          className="toggle-all"
          checked={allSelected}
          onChange={onToggleAll}
        />
        <label htmlFor="toggle-all" />
        <ul className="todo-list">
          {visibleTodos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </ul>
      </section>

      <footer className="footer">
        <span className="todo-count">
          <strong>{left}</strong> items left
        </span>
        <ul className="filters">
          <li>
            <NavLink exact={true} to="/" activeClassName="selected">
              All
            </NavLink>
          </li>
          <li>
            <NavLink to="/active" activeClassName="selected">
              Active
            </NavLink>
          </li>
          <li>
            <NavLink to="/completed" activeClassName="selected">
              Completed
            </NavLink>
          </li>
        </ul>
        {anyDone && (
          <button className="clear-completed" onClick={onClearCompleted}>
            Clear completed
          </button>
        )}
      </footer>
    </React.Fragment>
  );
}

export default withActuator(TodoList, { init, update, subscribe });

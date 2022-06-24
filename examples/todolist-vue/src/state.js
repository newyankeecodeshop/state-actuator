import { assignTo, Subscription } from "state-actuator";

const STORAGE_KEY = "vue-todomvc";

export function init() {
  // Same as what would be in the data() function
  return {
    todos: JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"),
    editedTodo: null,
    visibility: "all",
  };
}

export function update(model, msg) {
  console.info(msg);
  let todo;

  switch (msg.type) {
    case "EditTodo":
      todo = model.todos.find((todo) => todo.id === msg.todo.id);
      return assignTo(model, ["editedTodo", todo]);
    case "CancelEdit":
      return assignTo(model, ["editedTodo", null]);
    case "DoneEdit":
      let nextMsg;
      const title = msg.title.trim();
      if (!title) {
        nextMsg = { type: "RemoveTodo", todo: model.editedTodo };
      } else {
        nextMsg = { type: "UpdateTodo", todo: msg.todo, title: msg.title };
      }
      return [assignTo(model, ["editedTodo", null]), nextMsg];
    case "ChangeFilter":
      return assignTo(model, ["visibility", msg.filter]);
    default:
      // Messages that modify Todos can be handled separately
      return assignTo(model, ["todos", updateTodos(model.todos, msg)]);
  }
}

function updateTodos(todos, msg) {
  switch (msg.type) {
    case "AddTodo":
      if (!msg.title.trim()) return todos;
      return todos.concat({
        id: Date.now(),
        title: msg.title.trim(),
        completed: false,
      });
    case "UpdateTodo":
      return todos.map((todo) => {
        if (todo.id === msg.todo.id) {
          return assignTo(todo, ["title", msg.title]);
        } else {
          return todo;
        }
      });
    case "RemoveTodo":
      return todos.filter((todo) => todo.id !== msg.todo.id);
    case "RemoveCompleted":
      return todos.filter((todo) => !todo.completed);
    case "ToggleAll":
      return todos.map((todo) => ({ ...todo, completed: msg.completed }));
    case "ToggleDone":
      return todos.map((todo) => {
        if (todo.id === msg.todo.id) {
          return assignTo(todo, ["completed", !todo.completed]);
        } else {
          return todo;
        }
      });
  }
}

export function subscribe(model) {
  return Subscription(
    (updater) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(model.todos));

      const onHashChange = () => {
        var visibility = window.location.hash.replace(/#\/?/, "");
        updater({ type: "ChangeFilter", filter: visibility });
      };
      window.addEventListener("hashchange", onHashChange);
      return () => {
        window.removeEventListener("hashchange", onHashChange);
      };
    },
    [model.todos]
  );
}

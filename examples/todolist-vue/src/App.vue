<!--
A fully spec-compliant TodoMVC implementation
https://todomvc.com/
-->

<script>
import { StateActuator } from "state-actuator";
import { init, update, subscribe } from "./state.js";

// TODO: this should be a member of `this` via a plugin
const actuator = StateActuator({ init, update, subscribe });

const filters = {
  all: (todos) => todos,
  active: (todos) => todos.filter((todo) => !todo.completed),
  completed: (todos) => todos.filter((todo) => todo.completed),
};

export default {
  // app initial state
  data: () => actuator.initialModel,

  async mounted() {
    // Here we can start the iteration for new models
    // When we get the next model, we can update the "this" data properties
    for await (const nextModel of actuator) {
      this.todos = nextModel.todos;
      this.editedTodo = nextModel.editedTodo;
      this.visibility = nextModel.visibility;
    }
  },

  computed: {
    filteredTodos() {
      return filters[this.visibility](this.todos);
    },
    remaining() {
      return filters.active(this.todos).length;
    },
  },

  /*
  So it could be possible to do something like what Vuex does:
  methods: bindMessages([AddTodo, RemoveTodo]),
  which would create a bunch of functions that send the appropriate messages
  based on the name of the method. Could have an optional function to get the
  argument: ["addTodo", (e) => e.target.value]
  */
  methods: {
    toggleAll(e) {
      actuator.updater({ type: "ToggleAll", completed: e.target.checked });
    },

    toggleDone(todo) {
      actuator.updater({ type: "ToggleDone", todo });
    },

    addTodo(e) {
      actuator.updater({ type: "AddTodo", title: e.target.value });
      e.target.value = "";
    },

    removeTodo(todo) {
      actuator.updater({ type: "RemoveTodo", todo });
    },

    editTodo(todo) {
      actuator.updater({ type: "EditTodo", todo });
    },

    doneEdit(todo, e) {
      actuator.updater({ type: "DoneEdit", todo, title: e.target.value });
    },

    cancelEdit(todo) {
      actuator.updater({ type: "CancelEdit", todo });
    },

    removeCompleted() {
      actuator.updater({ type: "RemoveCompleted" });
    },
  },
};
</script>

<template>
  <section class="todoapp">
    <header class="header">
      <h1>todos</h1>
      <input
        class="new-todo"
        autofocus
        placeholder="What needs to be done?"
        @keyup.enter="addTodo"
      />
    </header>
    <section class="main" v-show="todos.length">
      <input
        id="toggle-all"
        class="toggle-all"
        type="checkbox"
        :checked="remaining === 0"
        @change="toggleAll"
      />
      <label for="toggle-all">Mark all as complete</label>
      <ul class="todo-list">
        <li
          v-for="todo in filteredTodos"
          class="todo"
          :key="todo.id"
          :class="{ completed: todo.completed, editing: todo === editedTodo }"
        >
          <div class="view">
            <input
              class="toggle"
              type="checkbox"
              :checked="todo.completed"
              @change="toggleDone(todo)"
            />
            <label @dblclick="editTodo(todo)">{{ todo.title }}</label>
            <button class="destroy" @click="removeTodo(todo)"></button>
          </div>
          <input
            v-if="todo === editedTodo"
            class="edit"
            type="text"
            @vnode-mounted="({ el }) => el.focus()"
            @blur="doneEdit(todo, $event)"
            @keyup.enter="doneEdit(todo, $event)"
            @keyup.escape="cancelEdit(todo)"
          />
        </li>
      </ul>
    </section>
    <footer class="footer" v-show="todos.length">
      <span class="todo-count">
        <strong>{{ remaining }}</strong>
        <span>{{ remaining === 1 ? " item" : "  items" }} left</span>
      </span>
      <ul class="filters">
        <li>
          <a href="#/all" :class="{ selected: visibility === 'all' }">All</a>
        </li>
        <li>
          <a href="#/active" :class="{ selected: visibility === 'active' }">Active</a>
        </li>
        <li>
          <a href="#/completed" :class="{ selected: visibility === 'completed' }">Completed</a>
        </li>
      </ul>
      <button class="clear-completed" @click="removeCompleted" v-show="todos.length > remaining">
        Clear completed
      </button>
    </footer>
  </section>
</template>

<style>
@import "https://unpkg.com/todomvc-app-css@2.4.1/index.css";
</style>

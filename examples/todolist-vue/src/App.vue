<!--
A fully spec-compliant TodoMVC implementation
https://todomvc.com/
-->

<script>
import { StateActuator } from "state-actuator";
import { messagesToMethods } from "state-actuator/vue";
import { Msg, init, update, subscribe } from "./state.js";

const filters = {
  all: (todos) => todos,
  active: (todos) => todos.filter((todo) => !todo.completed),
  completed: (todos) => todos.filter((todo) => todo.completed),
};

export default {
  // The VueActuator plugin requires the instance to have an actuator object.
  beforeCreate() {
    this.$actuator = StateActuator({ init, update, subscribe });
  },

  computed: {
    todoCount() {
      return this.model.todos.length;
    },
    filteredTodos() {
      return filters[this.model.visibility](this.model.todos);
    },
    remaining() {
      return filters.active(this.model.todos).length;
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
    ...messagesToMethods([
      Msg.EditTodo,
      Msg.RemoveTodo,
      Msg.CancelEdit,
      Msg.RemoveCompleted,
      Msg.ToggleDone,
    ]),

    toggleAll(e) {
      this.$actuator.updater(Msg.ToggleAll(e.target.checked));
    },

    addTodo(e) {
      this.$actuator.updater(Msg.AddTodo(e.target.value));
      e.target.value = "";
    },

    doneEdit(todo, e) {
      this.$actuator.updater(Msg.DoneEdit(todo, e.target.value));
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
    <section class="main" v-show="todoCount">
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
          :class="{ completed: todo.completed, editing: todo === model.editedTodo }"
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
            v-if="todo === model.editedTodo"
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
    <footer class="footer" v-show="todoCount">
      <span class="todo-count">
        <strong>{{ remaining }}</strong>
        <span>{{ remaining === 1 ? " item" : "  items" }} left</span>
      </span>
      <ul class="filters">
        <li>
          <a href="#/all" :class="{ selected: model.visibility === 'all' }">All</a>
        </li>
        <li>
          <a href="#/active" :class="{ selected: model.visibility === 'active' }">Active</a>
        </li>
        <li>
          <a href="#/completed" :class="{ selected: model.visibility === 'completed' }"
            >Completed</a
          >
        </li>
      </ul>
      <button class="clear-completed" @click="removeCompleted" v-show="todoCount > remaining">
        Clear completed
      </button>
    </footer>
  </section>
</template>

<style>
@import "https://unpkg.com/todomvc-app-css@2.4.1/index.css";
</style>

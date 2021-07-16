# state-actuator

`state-actuator` is a state management library that expands on the common "reducer" style of state management. It differs from vanilla React `useReducer` or Redux in the following ways:

- All state changes are driven by the submission of a message to the state actuator.
- Asynchronous state changes are built-in allowing the reducer to return Promises of messages.
- Messages sent to one actuator can be handled by another. When using `state-actuator` with React components, it allows a child component to send messages to a parent or ancestor.
- The implementation uses ES2018 `AsyncIterator`, which allows for customizing the processing of messages and models.

## Why `state-actuator`

There are a lot of choices for state management, both in the React ecosystem and beyond. I wanted
to explore a state system that imagines application or component state as an (asynchronous) iteration
over instances of models. What drives the changes to the model? Messages. Messages have been used in
GUI application development for decades; the Microsoft Win32 API sends messages to windows to change
their visual or behavioral attributes.

ES2018 introduced asynchronous iteration to the JavaScript language. This means we can now model
application state using basic language features such as Promises and Iterators.

# Getting Started

## Install

```sh
$ npm install state-actuator
```

or

```sh
$ yarn add state-actuator
```

### Install with React

If you're planning on using `state-actuator` to manage state for React components, you also need to make sure `react` and `hoist-non-react-statics` is installed. (Those packages are not specified as peer dependencies since they're necessary only when importing the React-specific HOC.)

```sh
$ npm install react hoist-non-react-statics
```

or

```sh
$ yarn add react hoist-non-react-statics
```

## Usage Example

The state actuator needs two functions to manage your state. The first is an `init()` function which creates an initial value for the state. The second is an `update()` function to process messages into new instances of the model.

```
function init() {
  return { value: "" }
}

function update(model, msg) {
  switch (msg.type) {
    case "AddDigit":
      return { value: model.value + msg.digit }
    case "DeleteDigit:
      return { value: model.value.slice(0, -1) }
  }
}

const actuator = StateActuator({ init, update })

```

# Concepts

## Models

The `Model` is the interface that defines the structure of the state. A model should contain all the properties that change over time.

## Messages

Messages are operations that change the state of the component. They typically represent user actions, but they might also represent
changes from the outside world. For example, a message `ChangeLocation` might be sent every time the OS notifies the app that the
location has changed. (See "Subscriptions" below.)

## Views

Views are responsible for two crucial parts of an application: (1) rendering the UI based on current state and (2) sending messages based on user actions from the UI.

## Subscriptions

A subscription is an optional feature in state actuators. It allows messages to be sent from sources other than the UI view.

## Context

Context provides access to state that is managed outside `state-actuator`. For example, if you're populating your model from a database
connection, the `Context` could include a database session object.

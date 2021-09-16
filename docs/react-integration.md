# Managing state in React components

You can use `state-actuator` to manage state for one or more React components as well as an entire React application.

## Overview

Using `state-actuator` to manage state for a React component requires using the HOC `withActuator`.
The `withActuator` HOC provides the following features:

- Provides the current state to the component using the `model` prop.
- Provides a function for sending messages using the `updater` prop.
- When the component is mounted, the model is initailized using the provider's `init` function. If the provider implements subscriptions, the `subscribe` function is called.
- When messages are received, a new model is generated using the provider's `update` function and `setState` is called to re-render the component with that model.
- Every time the component updates, the provider's `subscribe` function is called.

## Comparison to React hooks

The functionality provided by `state-actuator` can be built using various React hooks. For example, the `useReducer` React hook provides a mechanism to process updates based on "actions". The `useEffect` hooks allows you to run code during component mount/update/unmount events.

Nonetheless, `state-actuator` provides a more structured mechanism to process state changes based on well-defined actions. It also supports asynchronous operations natively, since it handles both messages and `Promise<Msg>`.

## Example

```typescript
import { withActuator, useUpdater } from "state-actuator/lib/react";

interface Model {
  value: number;
}

function Increment() {
  return { type: "Increment" } as const;
}
type Increment = ReturnType<typeof Increment>;

function Decrement() {
  return { type: "Decrement" } as const;
}
type Decrement = ReturnType<typeof Decrement>;

type Msg = Increment | Decrement;

function init(context: { initialValue: number }) {
  // When the model is initialized, the "context" argument contains the props to the component (without model and updater)
  return { value: context.initialValue };
}

function update(model: Model, msg: Msg): Model {
  switch (msg.type) {
    case "Increment":
      return { value: model.value + 1 };
    case "Decrement":
      return { value: model.value - 1 };
  }
}

interface MyComponentProps {
  initialValue: number;
  model: Model;
  updater: (msg: Msg) => void;
}

function MyComponent(props: MyComponentProps) {
  // Create memo-ized callbacks to pass to pure components.
  const onIncrement = useUpdater(Increment);
  const onDecrement = useUpdater(Decrement);

  return (
    <div>
      <button onClick={onIncrement}>➕</button>
      <span>{model.value}</span>
      <button onClick={onDecrement}>➖<button>
    </div>
  );
}

export default withActuator(MyComponent, { init, update });

```

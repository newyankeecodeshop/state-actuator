import * as React from "react";
import { AnyMsg, StateActuator, Stateful, Updater } from "../actuator";
import { UpdaterContext } from "./context";

/**
 * The basic contract for a stateful React Component
 */
interface IStateful<Model, Msg extends AnyMsg> {
  model: Model;
  updater: Updater<Msg>;
}

/**
 * Enable a React component to be stateful using the given state generator.
 * @param Component The react component
 * @param stateActuator The generator supplying state changes
 * @returns A stateful React component
 */
export function withActuator<Model, Msg extends AnyMsg>(
  Component: React.ComponentType<IStateful<Model, Msg>>,
  state: Stateful<Model, Msg>
) {
  class WithActuator extends React.Component<{}, { model: Model }> {
    static contextType = UpdaterContext;

    declare context: React.ContextType<typeof UpdaterContext>;

    private stateIter: AsyncIterableIterator<Model>;
    private stateActuator: StateActuator<Model, Msg>;

    constructor(props: {}) {
      super(props);

      const stateActuator = StateActuator(state);

      this.state = { model: stateActuator.initialModel };

      this.stateIter = stateActuator.stateIterator();
      this.stateActuator = stateActuator;
    }

    async componentDidMount() {
      // If the actuator cannot process the message,
      // allow it to "bubble" up the component hierarchy to the next actuator.
      this.stateActuator.unhandledUpdater = this.context;

      // Start processing state changes
      for await (const nextModel of this.stateIter) {
        this.setState({ model: nextModel });
      }
    }

    componentWillUnmount() {
      // Need to tell state generator we're done
      this.stateIter.return?.();
    }

    componentDidCatch(error: Error) {
      // Tell the state generator a rendering error occurred
      this.stateIter.throw?.(error);
    }

    render() {
      const { updater } = this.stateActuator;

      return (
        <UpdaterContext.Provider value={updater as Updater<AnyMsg>}>
          <Component model={this.state.model} updater={updater} {...this.props} />
        </UpdaterContext.Provider>
      );
    }
  }

  return WithActuator;
}

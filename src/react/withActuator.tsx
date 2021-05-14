import * as React from "react";
import { AnyMsg, StateActuator, Updater } from "../actuator";
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
  stateActuator: StateActuator<Model, Msg>
) {
  class WithActuator extends React.Component<{}, { model: Model }> {
    static contextType = UpdaterContext;

    declare context: React.ContextType<typeof UpdaterContext>;

    private stateIt: AsyncIterableIterator<Model>;
    private stateUpdater: Updater<AnyMsg>;

    constructor(props: {}) {
      super(props);

      this.state = { model: stateActuator.initialModel };

      this.stateIt = stateActuator.stateIterator();
      this.stateUpdater = stateActuator.updater as Updater<AnyMsg>;
    }

    async componentDidMount() {
      // If the actuator cannot process the message,
      // allow it to "bubble" up the component hierarchy to the next actuator.
      stateActuator.unhandledUpdater = this.context;

      // Start processing state changes
      for await (const nextModel of this.stateIt) {
        this.setState({ model: nextModel });
      }
    }

    componentWillUnmount() {
      // Need to tell state generator we're done
      this.stateIt.return?.();
    }

    componentDidCatch(error: Error) {
      // Tell the state generator a rendering error occurred
      this.stateIt.throw?.(error);
    }

    render() {
      return (
        <UpdaterContext.Provider value={this.stateUpdater}>
          <Component model={this.state.model} updater={this.stateUpdater} {...this.props} />
        </UpdaterContext.Provider>
      );
    }
  }

  return WithActuator;
}

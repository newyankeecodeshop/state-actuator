import * as React from "react";
import hoistNonReactStatics from "hoist-non-react-statics";

import { AnyMsg, ModelProvider, StateActuator, Updater } from "../actuator";
import { UpdaterContext } from "./context";

/**
 * The basic contract for a stateful React Component
 */
interface IStateful<Model, Msg extends AnyMsg> {
  model: Model;
  updater: Updater<Msg>;
}

/**
 * TODO: Need a way to pass initial model
 */
interface IActuatorProps {
  /**
   * Provide a means to handle messages that are meant to be handled by
   * a parent component (or application). This is useful for integrating
   * stateful components with existing applications that have a different
   * mechanism for handling UI events.
   */
  outboundMsgHandler?: Updater<AnyMsg>;
}

/**
 * Enable a React component to be stateful using the given state generator.
 * @param Component The react component
 * @param stateActuator The generator supplying state changes
 * @returns A stateful React component
 */
export function withActuator<Model, Msg extends AnyMsg, P>(
  Component: React.ComponentType<P & IStateful<Model, Msg>>,
  provider: ModelProvider<Model, Msg>
): React.ComponentType<P> {
  class WithActuator extends React.Component<P & IActuatorProps, { model: Model }> {
    static contextType = UpdaterContext;

    declare context: React.ContextType<typeof UpdaterContext>;

    private stateIter: AsyncIterableIterator<Model>;
    private stateActuator: StateActuator<Model, Msg>;

    constructor(props: P) {
      super(props);

      // TODO: pass props to actuator to implement `init(args)`?
      const stateActuator = StateActuator(provider);

      this.state = { model: stateActuator.initialModel };

      this.stateIter = stateActuator.stateIterator();
      this.stateActuator = stateActuator;
    }

    async componentDidMount() {
      // If the actuator cannot process the message,
      // allow it to "bubble" up the component hierarchy to the next actuator.
      this.stateActuator.outboundMsgHandler = this.props.outboundMsgHandler ?? this.context;

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

  hoistNonReactStatics(WithActuator, Component);
  return WithActuator;
}

import * as React from "react";
import hoistNonReactStatics from "hoist-non-react-statics";

import { AnyMsg, ModelProvider, StateActuator, Updater } from "../actuator.js";
import { UpdaterContext } from "./context.js";

/**
 * The basic contract for a stateful React Component
 */
interface IStateful<Model, Msg extends AnyMsg> {
  model: Model;
  updater: Updater<Msg>;
}

/**
 * Additional props supported by components using `withActuator`.
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
export function withActuator<Model, Msg extends AnyMsg, P extends IStateful<Model, Msg>>(
  Component: React.ComponentType<P>,
  provider: ModelProvider<Model, Msg, Omit<P, keyof IStateful<Model, Msg>>>
): React.ComponentType<Omit<P, keyof IStateful<Model, Msg>> & IActuatorProps> {
  class WithActuator extends React.Component<P & IActuatorProps, { model: Model }> {
    static contextType = UpdaterContext;

    declare context: React.ContextType<typeof UpdaterContext>;

    private stateActuator: StateActuator<Model, Msg>;

    constructor(props: P) {
      super(props);

      // The default update context is the current props
      const stateActuator = StateActuator({
        context: () => this.props,
        ...provider,
      });

      this.state = { model: stateActuator.initialModel };

      this.stateActuator = stateActuator;
    }

    async componentDidMount() {
      // If the actuator cannot process the message,
      // allow it to "bubble" up the component hierarchy to the next actuator.
      this.stateActuator.outboundMsgHandler = this.props.outboundMsgHandler ?? this.context;

      // Start processing state changes
      for await (const nextModel of this.stateActuator) {
        this.setState({ model: nextModel });
      }
    }

    componentWillUnmount() {
      // Finish the `for of` loop in the componentDidMount method
      this.stateActuator.close();
    }

    render() {
      const { updater } = this.stateActuator;
      const { outboundMsgHandler, ...props } = this.props;

      return (
        <UpdaterContext.Provider value={updater as Updater<AnyMsg>}>
          <Component {...(props as P)} model={this.state.model} updater={updater} />
        </UpdaterContext.Provider>
      );
    }
  }

  hoistNonReactStatics(WithActuator, Component);
  /* @ts-ignore-next */
  return WithActuator;
}

import * as React from "react";
import { AnyMsg, Stateful, Updater } from "../actuator";
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
 * @param stateGenerator The generator supplying state changes
 * @returns A stateful React component
 */
export function withActuator<Model, Msg extends AnyMsg>(
  Component: React.ComponentType<IStateful<Model, Msg>>,
  stateHolder: Stateful<Model, Msg>
) {
  class WithActuator extends React.Component<{}, { model: Model }> {
    //    private stateIt: AsyncIterator<Model>;

    static contextType = UpdaterContext;

    declare context: React.ContextType<typeof UpdaterContext>;

    constructor(props: {}) {
      super(props);

      this.state = { model: stateHolder.init() };
      this.handleMessage = this.handleMessage.bind(this);

      if (stateHolder.subscriptions) {
        stateHolder.subscriptions(this.state.model);
      }

      // TODO: make an iterator from the updater and update function
      //      this.stateIt = stateUpdates[Symbol.asyncIterator]();
    }

    componentDidMount() {
      // Need to tell state generator we're starting
      /*      let nextResult = this.stateIt.next();

      while (nextResult) {
        nextResult.then((result) => {
          this.setState({ model: result.value });

          if (!result.done) {
            nextResult = this.stateIt.next();
          }
        });
      }*/
    }

    componentWillUnmount() {
      // Need to tell state generator we're done
      /*      if (this.stateIt.return) this.stateIt.return();*/
    }

    componentDidCatch(error: Error) {
      // Tell the state generator a rendering error occurred
      /*      if (this.stateIt.throw) this.stateIt.throw(error);*/
    }

    private handleMessage(msg: AnyMsg): void {
      // TODO: this can be moved out into the non-react part of library
      // Also could expose this logic as an Iterable
      const result = stateHolder.update(this.state.model, msg as Msg);

      // If the update function never handles this message,
      // it "bubbles" up to the parent.
      if (result === undefined) {
        this.context(msg);
        return;
      }

      const nextModel = "model" in result ? result.model : result;

      // Handle any asynchronous messages
      if ("model" in result) {
        if (Array.isArray(result.message)) {
          result.message.forEach((p) => p.then(this.handleMessage));
        } else if (result.message) {
          result.message.then(this.handleMessage);
        }
      }

      // Don't call React if the state is identical
      if (nextModel === this.state.model) return;

      this.setState({ model: nextModel });

      if (stateHolder.subscriptions) {
        stateHolder.subscriptions(nextModel);
      }
    }

    render() {
      return (
        <UpdaterContext.Provider value={this.handleMessage}>
          <Component model={this.state.model} updater={this.handleMessage} {...this.props} />
        </UpdaterContext.Provider>
      );
    }
  }

  return WithActuator;
}

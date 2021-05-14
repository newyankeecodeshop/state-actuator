import { EventIterator } from "event-iterator";
import type { AnyMsg, StateActuator, Stateful, Updater } from "./actuator";

const { isArray } = Array;

/**
 * The actuator is a state container which models state changes using
 * an async iterator of models.
 * State changes are made by sending messages to the actuator, which process
 * them by calling a "Stateful" implementation provided by the application.
 */
class ActuatorImpl<Model, Msg extends AnyMsg> implements StateActuator<Model, Msg> {
  readonly initialModel: Readonly<Model>;

  public unhandledUpdater?: Updater<Msg>;

  private stateful: Stateful<Model, Msg>;
  // Each iterator will have its own message receiver
  private messageReceivers: Updater<Msg>[];

  constructor(stateful: Stateful<Model, Msg>) {
    // TODO: support model + msg
    this.initialModel = stateful.init();
    this.stateful = stateful;
    this.messageReceivers = [];

    this.updater = this.updater.bind(this);
  }

  updater(msg: Msg): void {
    for (const receiver of this.messageReceivers) receiver(msg);
  }

  stateIterator(): AsyncGenerator<Model> {
    // Create a message iterator based on messages received via `this.updater`
    const messageIt = new EventIterator<Msg>((queue) => {
      const count = this.messageReceivers.push(queue.push);
      return () => this.messageReceivers.splice(count - 1, 1);
    });
    return this.processMessages(messageIt);
  }

  private async *processMessages(messageIt: EventIterator<Msg>) {
    // Each iterator instance maintains its own model state
    let model = this.initialModel;

    for await (const msg of messageIt) {
      const nextModel = this.processMessage(model, msg);

      if (nextModel === undefined) {
        // TODO: Need to pass on message to parent actuator
        this.unhandledUpdater?.(msg);
      } else if (nextModel !== model) {
        yield (model = nextModel);
      }
    }
  }

  private processMessage(model: Model, msg: Msg): Model | undefined {
    let result = this.stateful.update(model, msg);
    // Unhandled messages will be given to next actuator
    if (result === undefined) return result;

    // Handle any asynchronous messages
    if ("model" in result) {
      if (isArray(result.message)) {
        result.message.forEach((p) => p.then(this.updater));
      } else if (result.message) {
        result.message.then(this.updater);
      }
      result = result.model;
    }

    return result;
  }
}

export default ActuatorImpl;

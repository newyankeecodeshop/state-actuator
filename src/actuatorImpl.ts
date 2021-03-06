import { EventIterator } from "event-iterator";
import type { Queue } from "event-iterator/lib/event-iterator";
import type { AnyMsg, ModelProvider, StateActuator, StateChange, Updater } from "./actuator.js";
import { setResponseUpdater } from "./messages.js";
import Subscription from "./subscription.js";

const { isArray } = Array;
const { is: isSame } = Object;

const defaultContext: () => unknown = () => {};

/**
 * The actuator is a state container which models state changes using
 * an async iterator of models.
 * State changes are made by sending messages to the actuator, which process
 * them by calling a "Stateful" implementation provided by the application.
 */
class ActuatorImpl<Model, Msg extends AnyMsg, C> implements StateActuator<Model, Msg> {
  readonly initialModel: Readonly<Model>;

  public outboundMsgHandler?: Updater<AnyMsg>;

  private provider: ModelProvider<Model, Msg, C>;

  private messageIter: EventIterator<Msg>;
  private modelIters: Array<Queue<Model>>;

  private currentSub?: Subscription<Msg>;

  constructor(stateful: ModelProvider<Model, Msg, C>) {
    const initialState = stateful.init(stateful.context?.()!);

    this.provider = stateful;
    // The `updater` implementation will add messages to the iterator queue
    this.messageIter = new EventIterator<Msg>((queue) => {
      this.updater = (msg: Msg) => queue.push(msg);
      this.close = () => this.closeMessageIterator(queue);
    });
    this.modelIters = [];
    // Like with updates, the initial state may include async messages to send
    this.initialModel = processStateChange(initialState, this.updater);
  }

  updater(_: Msg) {
    console.warn("The iterator has been closed - messages are ignored");
  }

  close() {}

  stateIterator(): AsyncIterator<Model> {
    return this.newModelIterator()[Symbol.asyncIterator]();
  }

  [Symbol.asyncIterator](): AsyncIterator<Model> {
    return this.newModelIterator()[Symbol.asyncIterator]();
  }

  private newModelIterator() {
    const { modelIters } = this;

    if (modelIters.length === 0) {
      // First iterator -> start processing messages
      setTimeout(this.processMessages.bind(this), 0);
    }
    return new EventIterator<Model>((queue) => {
      // Need to add the queue to a list so that each time a message is recevied,
      // we can process a new model and add it all queues.
      let length = modelIters.push(queue);
      // When the iterator is closed, remove the queue
      return () => modelIters.splice(length - 1, 1);
    });
  }

  private async processMessages() {
    // Each iterator instance maintains its own model state
    let model = this.initialModel;

    this.callSubscriber(model);

    for await (const msg of this.messageIter) {
      const nextModel = this.processMessage(model, msg);

      if (nextModel === undefined) {
        // Need to pass on message to any parent actuator
        this.outboundMsgHandler?.(setResponseUpdater(msg, this.updater));
        continue;
      }

      nextModel.then((nextModel) => {
        if (!isSame(nextModel, model)) {
          // Return new values only when the model is updated
          this.callSubscriber(nextModel);

          model = nextModel;
          // broadcast the change to all model iterators
          this.modelIters.forEach((queue) => queue.push(nextModel));
        }
      });
    }

    this.removeSubscriber();
  }

  private processMessage(model: Model, msg: Msg) {
    const provider = this.provider;
    let result = provider.update(model, msg, provider.context?.()!);

    if (isThenable(result)) {
      // State change is async, return the current state
      return result.then((state) => processStateChange(state, this.updater));
    } else if (result !== undefined) {
      // Unhandled messages will be given to next actuator
      return Promise.resolve(processStateChange(result, this.updater));
    }
  }

  private closeMessageIterator(queue: Queue<Msg>) {
    // If there is a pending promise, resolve it done
    queue.stop();
    // If there are messages already pushed, clear them out
    this.messageIter[Symbol.asyncIterator]().return?.();
    // Reset the listener methods to indicate a closed state
    this.close = ActuatorImpl.prototype.close;
    this.updater = ActuatorImpl.prototype.updater;
    // Tell all the model iterators
    this.modelIters.forEach((queue) => queue.stop());
  }

  // ----- SUBSCRIPTIONS -----

  private callSubscriber(model: Model) {
    const { subscribe, context = defaultContext } = this.provider;

    if (!subscribe) return;

    const subscription = subscribe(model, context() as C);

    if (!this.currentSub?.equals(subscription)) {
      this.removeSubscriber();
      this.currentSub = subscription;
      this.currentSub.invoke(this.updater);
    }
  }

  private removeSubscriber() {
    if (this.currentSub) {
      this.currentSub.remove();
      delete this.currentSub;
    }
  }
}

function processStateChange<Model, Msg extends AnyMsg>(
  result: StateChange<Model, Msg>,
  updater: Updater<Msg>
): Model {
  // A tuple that contains a message should not be treated as a Model.
  // A model that is an array hopefully doesn't have an array of messages.
  if (isArray(result) && isActuatorMsg(result[1])) {
    const model = result.shift();
    (result as Msg[]).forEach(updater);
    return model as Model;
  }
  return result as Model;
}

function isActuatorMsg(param: any): param is AnyMsg {
  return typeof param === "object" && typeof param?.type === "string";
}

function isThenable<T>(param: any): param is Promise<T> {
  return typeof param === "object" && typeof param?.then === "function";
}

export default ActuatorImpl;

import { EventIterator } from "event-iterator";
import type { AnyMsg, ModelProvider, StateActuator, StateChange, Updater } from "./actuator";
import Subscription from "./subscription";

const { isArray } = Array;
const { is } = Object;

const defaultContext: () => unknown = () => {};

/**
 * The actuator is a state container which models state changes using
 * an async iterator of models.
 * State changes are made by sending messages to the actuator, which process
 * them by calling a "Stateful" implementation provided by the application.
 */
class ActuatorImpl<Model, Msg extends AnyMsg, C> implements StateActuator<Model, Msg> {
  readonly initialModel: Readonly<Model>;

  public outboundMsgHandler?: Updater<Msg>;

  private provider: ModelProvider<Model, Msg, C>;
  // We need an Iterator<Msg> to implement Iterator<Model>
  private messageIter: EventIterator<Msg>;

  private currentSub?: Subscription<Msg>;

  constructor(stateful: ModelProvider<Model, Msg, C>) {
    const initialState = stateful.init(stateful.context?.()!);

    this.provider = stateful;
    // The `updater` implementation will add messages to the iterator queue
    this.messageIter = new EventIterator<Msg>((queue) => {
      this.updater = (msg: Msg) => queue.push(msg);
      return () => (this.updater = ActuatorImpl.prototype.updater);
    });
    // Like with updates, the initial state may include async messages to send
    this.initialModel = processStateChange(initialState, this.updater);
  }

  updater(_: Msg) {
    console.warn("The iterator has been closed - messages are ignored");
  }

  stateIterator(): AsyncGenerator<Model> {
    // TODO: What happens if another generator is created?
    // Should the creation of the iterator start a new process?
    return this.processMessages(this.messageIter);
  }

  private async *processMessages(messageIter: EventIterator<Msg>) {
    // Each iterator instance maintains its own model state
    let model = this.initialModel;

    this.callSubscriber(model);

    for await (const msg of messageIter) {
      const nextModel = this.processMessage(model, msg);

      if (nextModel === undefined) {
        // Need to pass on message to any parent actuator
        this.outboundMsgHandler?.(msg);
      } else if (!is(nextModel, model)) {
        // Return new values only when the model is updated
        this.callSubscriber(nextModel);

        yield (model = nextModel);
      }
    }
  }

  private processMessage(model: Model, msg: Msg): Model | undefined {
    const provider = this.provider;
    let result = provider.update(model, msg, provider.context?.()!);
    // Unhandled messages will be given to next actuator
    if (result !== undefined) {
      return processStateChange(result, this.updater);
    }
  }

  // ----- SUBSCRIPTIONS -----

  private callSubscriber(model: Model) {
    const { subscribe, context = defaultContext } = this.provider;

    if (!subscribe) return;

    const subscription = subscribe(model, context() as C);

    if (!this.currentSub?.equals(subscription)) {
      this.currentSub?.remove();
      this.currentSub = subscription;
      this.currentSub.invoke(this.updater);
    }
  }
}

function processStateChange<Model, Msg extends AnyMsg>(
  result: StateChange<Model, Msg>,
  updater: Updater<Msg>
): Model {
  // A tuple that contains a promise should not be treated as a Model.
  // A model that is an array is very certain never to be an array of promises.
  if (isArray(result) && result[1] instanceof Promise) {
    const [model, ...promises] = result;
    promises.forEach((p) => p.then(updater));
    return model;
  }
  return result as Model;
}

export default ActuatorImpl;

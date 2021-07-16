import ActuatorImpl from "./actuatorImpl";

/**
 * All messages require an identifier.
 * The identifier should be serializable so messages can be persisted.
 */
export type AnyMsg = { readonly type: string };

/**
 * An updater receives messages to be processed by the state generator.
 */
export type Updater<M extends AnyMsg> = (msg: M) => void;

/**
 * An update function can return new state plus message(s) to send.
 */
export type StateChange<Model, Msg extends AnyMsg> = Model | [Model, ...Promise<Msg>[]];

/**
 * The functions necessary to implement a stateful component that can
 * process messages.
 */
export interface ModelProvider<Model, Msg extends AnyMsg, Context> {
  /**
   * Creates the initial state.
   * Context is provided to allow models to generate state based on other data sources.
   */
  init(context: Context): StateChange<Model, Msg>;
  /**
   * Converts messages into new models.
   * Can also return messages to be sent asynchronously, enabling
   * state changes based on network responses or other async activity.
   */
  update(model: Model, msg: Msg, context: Context): StateChange<Model, Msg> | undefined;
  /**
   * Provides a mechanism to generate messages based on an asynchronous API.
   * It's called on every model update.
   */
  subscriptions?(model: Model): void;
  /**
   * Return the current context for use in update processing.
   * Context is useful for providing access to other state that is not managed
   * by `state-actuator`.
   */
  context?(): Context;
}

/**
 * The core implementation
 */
export interface StateActuator<Model, Msg extends AnyMsg> {
  /**
   * The state when the actuator is created.
   */
  readonly initialModel: Readonly<Model>;

  /**
   * The updater recevies messages generated by the application.
   */
  readonly updater: Updater<Msg>;

  /**
   * The updater that receives messages not handled by this actuator.
   */
  outboundMsgHandler?: Updater<Msg>;

  /**
   * Return a new iterator over state changes.
   * Multiple iterators can be created and work in parallel.
   */
  stateIterator(): AsyncIterableIterator<Model>;
}

/**
 * Create a state actuator given the state definition
 * @param provider Functions to implement the state management lifecycle
 * @returns The actuator implementation
 */
export function StateActuator<Model, Msg extends AnyMsg, Context = {}>(
  provider: ModelProvider<Model, Msg, Context>
): StateActuator<Model, Msg> {
  return new ActuatorImpl(provider);
}

/**
 * Test a value to see if it implements the 'AnyMsg' structure.
 */
export function isActuatorMsg(param: any): param is AnyMsg {
  return typeof param === "object" && "type" in param;
}

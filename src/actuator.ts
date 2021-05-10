/**
 * All messages require an identifier.
 */
export type AnyMsg = { id: string | symbol };

/**
 * An updater receives messages to be processed by the state generator.
 */
export type Updater<M extends AnyMsg> = (msg: M) => void;

/**
 * An update function can return new state plus message(s) to send.
 */
export type StateChange<Model, Msg extends AnyMsg> = {
  model: Model;
  message?: Promise<Msg> | Promise<Msg>[];
};

/**
 * The functions necessary to implement a stateful component that can
 * process messages.
 */
export interface Stateful<Model, Msg extends AnyMsg> {
  /**
   * Creates the initial state.
   * // TODO: Also allow folks to send an initial message!
   */
  init(): Model;
  /**
   * Converts messages into new models.
   * Can also return messages to be sent asynchronously, enabling
   * state changes based on network responses or other async activity.
   */
  update(model: Model, msg: Msg): Model | StateChange<Model, Msg>;
  /**
   * Provides a mechanism to generate messages based on an asynchronous API.
   * It's called on every model update.
   */
  subscriptions?(model: Model): void;
}

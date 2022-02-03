import { createContext, useCallback, useContext } from "react";

import type { AnyMsg, Updater } from "../actuator.js";
import { getResponseUpdater } from "../messages.js";

/**
 * This context provides an updater to descendant stateful components
 * so that messages can "bubble" up the component (view) hierarchy.
 */
const UpdaterContext = createContext<Updater<AnyMsg>>(nullUpdater);

function nullUpdater(msg: AnyMsg) {
  throw new Error(`Message "${msg.type}" not handled by any updater!`);
}

/**
 * A hook which binds a prop callback to send a specific message via the updater in context.
 * This uses the callback hook so that instances are cached and can be used with pure components.
 *
 * @param MsgConstructor The message to send to that updater
 * @returns A function to use with a callback prop
 * @see https://reactjs.org/docs/hooks-reference.html#usecallback
 */
function useUpdater<Msg extends AnyMsg, A extends any[]>(
  MsgConstructor: (...args: A) => Msg
): (...args: A) => void {
  const updater = useContext(UpdaterContext);

  return useCallback((...args: A) => updater(MsgConstructor(...args)), [updater]);
}

function useResponseUpdater(responseMsg?: AnyMsg): ((data?: object) => void) | undefined {
  if (responseMsg == null) return undefined;

  const updater = getResponseUpdater(responseMsg);

  return useCallback((data?: object) => updater({ ...responseMsg, ...data }), [responseMsg]);
}

export { UpdaterContext, useUpdater, useResponseUpdater };

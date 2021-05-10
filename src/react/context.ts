import { createContext, useCallback, useContext } from "react";

import type { AnyMsg, Updater } from "../actuator";

/**
 * This context provides an updater to descendant stateful components
 * so that messages can "bubble" up the component (view) hierarchy.
 */
const UpdaterContext = createContext<Updater<AnyMsg>>(nullUpdater);

function nullUpdater(msg: AnyMsg) {
  throw new Error(`Message "${String(msg.id)}" not handled by any updater!`);
}

/**
 * A hook which binds a prop callback to send a message via the updater
 * in context.
 * @returns A function to use with a callback prop
 */
function useUpdater<Msg extends AnyMsg>(fn: (...args: any[]) => Msg) {
  const updater = useContext(UpdaterContext);

  return useCallback((...args: any[]) => updater(fn(args)), [updater]);
}

export { UpdaterContext, useUpdater };

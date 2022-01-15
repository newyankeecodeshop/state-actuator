import { AnyMsg, AS_OUTBOUND_MSG, StateChange, Updater } from "./actuator";

export type SenderMsg = { readonly type: string; readonly data: any[] };

export function createSender(updater: Updater<SenderMsg>) {
  const cache = new Map<String, (args: any[]) => void>();

  return new Proxy(updater, {
    get(target, property, receiver) {
      // Symbols aren't used for message types, so default behavior here
      if (typeof property === "symbol") {
        return Reflect.get(target, property, receiver);
      }
      // We cache the send function for efficiency with UI components like React
      if (!cache.has(property)) {
        cache.set(property, (...args: any[]) => target({ type: property, data: args }));
      }
      return cache.get(property);
    },
  });
}

type MsgReceiver<T> = Record<string, (...args: any[]) => T>;

export function receive<Model>(
  msg: SenderMsg,
  receiver: MsgReceiver<StateChange<Model, AnyMsg>>
): StateChange<Model, AnyMsg> {
  // The receiver should have method names that match the message types
  if (msg.type in receiver) {
    return receiver[msg.type].apply(null, msg.data);
  } else {
    return AS_OUTBOUND_MSG;
  }
}

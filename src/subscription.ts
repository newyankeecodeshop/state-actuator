import type { AnyMsg, Subscriber } from "./actuator";

class Subscription<Msg extends AnyMsg> {
  readonly subs: Subscriber<Msg>;
  readonly keys: Array<any>;

  private unsub?: () => void;

  constructor(subs: Subscriber<Msg>, keys: Array<any> = []) {
    this.subs = subs;
    this.keys = keys;
  }

  public equals(other: Subscription<Msg>) {
    // Two subscribers are equal if their keys are equal
    return arraysEqual(this.keys, other.keys);
  }

  public invoke(updater: (msg: Msg) => void) {
    this.unsub = this.subs(updater);
  }

  public remove() {
    this.unsub?.();
  }
}

function arraysEqual<T>(a1: Array<T>, a2: Array<T>) {
  if (a1.length !== a2.length) {
    return false;
  }
  return a1.every((value, index) => value === a2[index]);
}

export default Subscription;

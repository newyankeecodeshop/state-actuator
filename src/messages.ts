import type { AnyMsg } from "./actuator";

export const responseKey = Symbol("state-actuator.response");
const responseUpdater = Symbol("state-actuator.updater");

interface MsgWithResponse extends AnyMsg {
  [sym: symbol]: ResponseMsg;
}

interface ResponseMsg extends AnyMsg {
  // Reinstate w/ Upgrade to TS 4.4.0
  //   [sym: symbol]: (msg: AnyMsg) => void;
}

export function getResponseUpdater(responseMsg: ResponseMsg): (msg: AnyMsg) => void {
  // @ts-expect-error
  return responseMsg[responseUpdater];
}

export function setResponseUpdater<Msg extends AnyMsg>(
  msg: AnyMsg,
  updater: (msg: Msg) => void
): AnyMsg {
  if (isMsgWithResponse(msg)) {
    const responseMsg = msg[responseKey];
    // @ts-expect-error
    responseMsg[responseUpdater] = updater;
  }

  return msg;
}

function isMsgWithResponse(msg: any): msg is MsgWithResponse {
  return msg[responseKey] != null;
}

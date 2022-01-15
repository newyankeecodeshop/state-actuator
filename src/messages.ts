import type { AnyMsg } from "./actuator.js";

export const responseKey = Symbol("state-actuator.response");
const responseUpdater = Symbol("state-actuator.updater");

interface MsgWithResponse extends AnyMsg {
  [sym: symbol]: ResponseMsg;
}

interface ResponseMsg extends AnyMsg {
  [sym: symbol]: (msg: AnyMsg) => void;
}

export function getResponseUpdater(responseMsg: ResponseMsg): (msg: AnyMsg) => void {
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

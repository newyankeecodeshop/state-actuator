import assert from "assert/strict";
import sinon from "sinon";

import { createSender, receive } from "../lib/sendReceive.js";

describe("sendReceive", () => {
  describe("createSender", () => {
    const updater = sinon.fake();
    const send = createSender(updater);

    it("returns functions based on property names", () => {
      assert(typeof send.Message1 === "function");
      assert(typeof send.AnotherMessage === "function");
    });

    it("returns one function per property access", () => {
      const send1 = send.Something;

      assert(send.Something === send1);
      assert(send.Something === send1);
      assert(send.Something === send1);

      assert(send.SomethingElse !== send1);
    });

    it("sends messages via the updater", () => {
      send.AddLetters("a", "b", "c");
      assert(updater.calledOnceWith({ type: "AddLetters", data: ["a", "b", "c"] }));
    });
  });

  describe("receive", () => {
    it("calls the receiver object based on the message", () => {
      const msg = { type: "AddLetters", data: ["a", "b", "c"] };
      const result = receive(msg, {
        AddLetters(arg1, arg2, arg3) {
          assert(arg1 === "a");
          assert(arg2 === "b");
          assert(arg3 === "c");
          return { status: "abc" };
        },
        AnotherMessage() {},
      });
      assert(result.status === "abc");
    });
    it("returns AS_OUTBOUND_MSG for messages not received", () => {
      const msg = { type: "AddLetters", data: ["a", "b", "c"] };
      const result = receive(msg, {
        RemoveLetters(arg1, arg2, arg3) {
          assert(arg1 === "a");
          assert(arg2 === "b");
          assert(arg3 === "c");
          return { status: "abc" };
        },
        AnotherMessage() {},
      });
      assert(result === undefined);
    });
  });
});

import assert from "assert/strict";
import sinon from "sinon";
import { StateActuator, Subscription, responseKey, getResponseUpdater } from "../lib/index.js";

function delay(value) {
  return new Promise((resolve) => setTimeout(resolve, 10, value));
}

describe("StateActuator", function () {
  const stateful = {
    init() {
      return { data: ["init"], changeCount: 0 };
    },
    update(model, msg) {
      switch (msg.type) {
        case "AddData":
          return { data: model.data.concat(msg.value), changeCount: model.changeCount + 1 };

        case "ClearData":
          return { data: [], changeCount: model.changeCount + 1 };

        case "LoadData":
          return delay({ data: ["a", "b", "c"], changeCount: model.changeCount + 1 });
      }
    },
  };

  describe("Basic message processing", function () {
    it("calls the init function to setup initial state", () => {
      const actuator = StateActuator(stateful);
      assert(actuator.initialModel.data[0] === "init");
      assert(actuator.initialModel.changeCount === 0);
    });

    it("calls the update function to process messages", async () => {
      const actuator = StateActuator(stateful);
      const iterator = actuator.stateIterator();

      actuator.updater({ type: "AddData", value: "New York" });
      actuator.updater({ type: "ClearData" });
      actuator.updater({ type: "AddData", value: "Rhode Island" });

      assert.deepStrictEqual(await iterator.next(), {
        done: false,
        value: { data: ["init", "New York"], changeCount: 1 },
      });
      assert.deepStrictEqual(await iterator.next(), {
        done: false,
        value: { data: [], changeCount: 2 },
      });
      assert.deepStrictEqual(await iterator.next(), {
        done: false,
        value: { data: ["Rhode Island"], changeCount: 3 },
      });
    });

    it("supports multiple iterators used together", async function () {
      const actuator = StateActuator(stateful);

      actuator.updater({ type: "AddData", value: "New York" });
      actuator.updater({ type: "ClearData" });
      actuator.updater({ type: "AddData", value: "Rhode Island" });

      const iterator1 = actuator.stateIterator();
      const iterator2 = actuator.stateIterator();

      let result1 = await iterator1.next();
      let result2 = await iterator2.next();
      assert.deepEqual(result1, result2);

      result1 = await iterator1.next();
      result2 = await iterator2.next();
      assert.deepEqual(result1, result2);

      result1 = await iterator1.next();
      result2 = await iterator2.next();
      assert.deepEqual(result1, result2);

      actuator.close();

      result1 = await iterator1.next();
      result2 = await iterator2.next();
      assert(result1.done && result2.done);
    });
  });

  describe("Async message processing", function () {
    it("handles model and messages from the update function", async () => {
      const actuator = StateActuator(stateful);
      const iterator = actuator.stateIterator();

      actuator.updater({ type: "AddData", value: "New York" });
      actuator.updater({ type: "LoadData" });

      assert.deepStrictEqual(await iterator.next(), {
        done: false,
        value: { data: ["init", "New York"], changeCount: 1 },
      });
      assert.deepStrictEqual(await iterator.next(), {
        done: false,
        value: { data: ["a", "b", "c"], changeCount: 2 },
      });
    });
  });

  describe("Using Context", function () {
    const actuator = StateActuator({
      context: () => 1000,
      init: (context) => ({ state: context }),
      update: (model, _, context) => {
        // Keep adding context to indicate it worked
        return { state: model.state + context };
      },
    });
    const iterator = actuator.stateIterator();

    it("passes context to the 'init()' function", () => {
      assert(actuator.initialModel.state === 1000);
    });

    it("passes context to the 'update()' function", async () => {
      actuator.updater({ type: "DoSomething" });
      actuator.updater({ type: "DoSomething" });

      const result1 = await iterator.next();
      const result2 = await iterator.next();

      assert(result1.value.state === 2000);
      assert(result2.value.state === 3000);
    });
  });

  describe("Subscription processing", function () {
    it("calls the subscription every time the model changes", async () => {
      // This subscribe function just tracks calls
      const subscribeFunc = sinon.fake();
      const subscribe = sinon.fake.returns(Subscription(subscribeFunc));

      const actuator = StateActuator({ ...stateful, subscribe });
      const iterator = actuator.stateIterator();

      actuator.updater({ type: "AddData", value: "New York" });
      actuator.updater({ type: "AddData", value: "Philadelphia" });

      let result = await iterator.next();
      // Called twice, once with initial model, then with first AddData
      assert(subscribe.callCount == 2);
      assert(subscribeFunc.calledWithExactly(actuator.updater));

      result = await iterator.next();
      // Called a third time after second AddData message
      assert(subscribe.callCount == 3);
      assert(subscribeFunc.calledWithExactly(actuator.updater));
    });

    it("uses keys to determine when to remove the subscription", async () => {
      const subscribeRemove = sinon.fake();

      function subscribe(model) {
        return Subscription(
          (_) => {
            return subscribeRemove;
          },
          [model.changeCount]
        );
      }

      const actuator = StateActuator({ ...stateful, subscribe });
      const iterator = actuator.stateIterator();

      // Send some messages
      actuator.updater({ type: "AddData", value: "New York" });
      actuator.updater({ type: "AddData", value: "Philadelphia" });
      actuator.updater({ type: "AddData", value: "Baltimore" });

      let result = await iterator.next();
      assert.equal(subscribeRemove.callCount, 1);

      result = await iterator.next();
      assert.equal(subscribeRemove.callCount, 2);

      result = await iterator.next();
      assert.equal(subscribeRemove.callCount, 3);
    });

    it("calls the subscription cleanup function", async () => {
      const subscribeRemove = sinon.fake();

      function subscribe(_) {
        return Subscription((_) => {
          return subscribeRemove;
        });
      }

      const actuator = StateActuator({ ...stateful, subscribe });
      const iterator = actuator.stateIterator();

      // Send some messages
      actuator.updater({ type: "AddData", value: "New York" });
      actuator.updater({ type: "AddData", value: "Philadelphia" });
      actuator.updater({ type: "AddData", value: "Baltimore" });

      let result = await iterator.next();
      assert.equal(subscribeRemove.callCount, 0);

      actuator.close();

      result = await iterator.next();
      assert(result.done);
      // Need to do one more async operation before subscription is removed
      result = await iterator.next();
      assert.equal(subscribeRemove.callCount, 1);
    });
  });

  describe("message responses", function () {
    const statefulParent = {
      init() {
        return { title: "", body: "", responseMsg: null };
      },
      update(model, msg) {
        switch (msg.type) {
          case "ShowConfirmation":
            return { title: msg.title, body: msg.body, responseMsg: msg[responseKey] };
        }
      },
    };

    function ShowConfirmation(title, body, responseMsg) {
      return { type: "ShowConfirmation", title, body, [responseKey]: responseMsg };
    }

    const parentActuator = StateActuator(statefulParent);
    const parentIterator = parentActuator.stateIterator();

    const childActuator = StateActuator(stateful);
    const childIterator = childActuator.stateIterator();

    childActuator.outboundMsgHandler = parentActuator.updater;

    it("handles the childs update msg", async () => {
      let parentAsyncResult = parentIterator.next();
      let childAsyncResult = childIterator.next();

      const addDataMsg = { type: "AddData", value: "RI" };

      childActuator.updater(ShowConfirmation("title", "body", addDataMsg));

      let { value: parentModel } = await parentAsyncResult;

      assert(parentModel.title === "title");
      assert(parentModel.body === "body");

      assert(parentModel.responseMsg === addDataMsg);

      const responseUpdater = getResponseUpdater(parentModel.responseMsg);
      responseUpdater(parentModel.responseMsg);

      let { value: childModel } = await childAsyncResult;

      assert(childModel.data[1] == "RI");
      assert(childModel.changeCount == 1);
    });
  });
});

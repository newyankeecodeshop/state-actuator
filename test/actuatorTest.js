const assert = require("assert");
const { StateActuator } = require("../lib/actuator");

function delay(value) {
  return new Promise((resolve) => setTimeout(resolve, 10, value));
}

describe("StateActuator", function () {
  const stateful = {
    init() {
      return { data: ["init"], changeCount: 0 };
    },
    update(model, msg) {
      switch (msg.id) {
        case "AddData":
          return { data: model.data.concat(msg.value), changeCount: ++model.changeCount };

        case "ClearData":
          return { data: [], changeCount: ++model.changeCount };

        case "LoadData":
          return { model, message: delay({ id: "LoadDataSuccess", data: ["a", "b", "c"] }) };

        case "LoadDataSuccess":
          return { data: msg.data, changeCount: ++model.changeCount };
      }
    },
  };

  describe("Basic message processing", () => {
    it("calls the init function to setup initial state", () => {
      const actuator = StateActuator(stateful);
      assert(actuator.initialModel.data[0] === "init");
      assert(actuator.initialModel.changeCount === 0);
    });

    it("calls the update function to process messages", async () => {
      const actuator = StateActuator(stateful);
      const iterator = actuator.stateIterator();

      actuator.updater({ id: "AddData", value: "New York" });
      actuator.updater({ id: "ClearData" });
      actuator.updater({ id: "AddData", value: "Rhode Island" });

      assert.notStrictEqual(await iterator.next(), {
        done: false,
        value: { data: ["init", "New York"], changeCount: 1 },
      });
      assert.notStrictEqual(await iterator.next(), {
        done: false,
        value: { data: [], changeCount: 2 },
      });
      assert.notStrictEqual(await iterator.next(), {
        done: false,
        value: { data: ["Rhode Island"], changeCount: 3 },
      });
    });
  });

  describe("Async message processing", () => {
    it("handles model and messages from the update function", async () => {
      const actuator = StateActuator(stateful);
      const iterator = actuator.stateIterator();

      actuator.updater({ id: "AddData", value: "New York" });
      actuator.updater({ id: "LoadData" });

      assert.notStrictEqual(await iterator.next(), {
        done: false,
        value: { data: ["init", "New York"], changeCount: 1 },
      });
      assert.notStrictEqual(await iterator.next(), {
        done: false,
        value: { data: ["a", "b", "c"], changeCount: 2 },
      });
    });
  });
});

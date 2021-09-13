const assert = require("assert");
const { assignTo } = require("../lib/index");

describe("updates", () => {
  describe("assignTo", () => {
    it("sets the value of a single property", () => {
      const model = { a: 1, b: 2, c: "3" };

      const model1 = assignTo(model, ["a", 10]);
      assert(model1 !== model);
      assert(model1.a === 10);
      assert(model1.b === 2 && model1.c === "3");

      const model2 = assignTo(model, ["c", 3]);
      assert(model2 !== model);
      assert(model2.c === 3);
      assert(model2.b === 2 && model2.a === 1);
    });

    it("sets the values of multiple properties", () => {
      const model = { a: 1, b: 2, c: "3" };

      const model1 = assignTo(model, { a: "aa", b: "bb", c: "33" });
      assert(model1 !== model);
      assert(model1.a === "aa");
      assert(model1.b === "bb" && model1.c === "33");

      const model2 = assignTo(model, {});
      assert(model2 === model);
    });

    it("returns the original object for equal values", () => {
      const model = { a: 1, b: 2, c: "3" };

      const model1 = assignTo(model, ["a", 1]);
      assert(model1 === model);

      const model2 = assignTo(model, { b: 2, c: "3" });
      assert(model2 === model);
    });
  });
});

import type { App, MethodOptions } from "@vue/runtime-core";
import type { AnyMsg, StateActuator } from "../actuator.js";

interface IComponent<Model = any> {
  readonly $actuator?: StateActuator<Model, AnyMsg>;
  model: Model;
}

/**
 * The Vue plugin for state-actuator. This will add mixin code for components
 * that wish to use state-actuator to manage their state.
 * The component needs to have a `$actuator` property set, typically in `beforeCreate()`.
 */
export const VueActuator = {
  install(app: App) {
    // TODO: hook up the outboundMessageHandler to any ancestor component w/ actuator
    app.mixin({
      // @ts-ignore
      data(this: IComponent) {
        if (this.$actuator == null) return {};

        return { model: this.$actuator.initialModel };
      },

      async mounted(this: IComponent) {
        if (this.$actuator == null) return;

        for await (const nextModel of this.$actuator) {
          this.model = nextModel;
        }
      },

      unmounted(this: IComponent) {
        this.$actuator?.close();
      },
    });
  },
};

type MsgConstructor = (...args: any[]) => AnyMsg;

/**
 * Returns an object that can be used for the `methods()` property of a Vue component.
 * Message types are mapped to method names with the leading letter in lowercase.
 */
export function messagesToMethods(constructors: MsgConstructor[]): MethodOptions {
  return constructors.reduce((acc, constructor) => {
    const methodName = lowercaseFirst(constructor.name);

    acc[methodName] = function (this: IComponent, ...args: any[]) {
      this.$actuator!.updater(constructor.apply(null, args));
    };
    return acc;
  }, {} as MethodOptions);
}

function lowercaseFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

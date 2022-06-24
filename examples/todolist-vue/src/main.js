import { createApp } from "vue";
import { VueActuator } from "state-actuator/vue";

import App from "./App.vue";

createApp(App).use(VueActuator).mount("#app");

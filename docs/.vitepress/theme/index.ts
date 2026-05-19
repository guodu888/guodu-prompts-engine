import DefaultTheme from "vitepress/theme";
import "../theme.css";
import type { Theme } from "vitepress";
import PromptPlayground from "./components/PromptPlayground.vue";

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("PromptPlayground", PromptPlayground);
  }
};

export default theme;

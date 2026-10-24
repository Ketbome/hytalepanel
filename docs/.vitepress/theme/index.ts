import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme-without-fonts";
import { h } from "vue";
import HomePage from "./components/HomePage.vue";
import NotFound from "./components/NotFound.vue";
import ReadingProgress from "./components/ReadingProgress.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "layout-top": () => h(ReadingProgress),
      "not-found": () => h(NotFound),
    }),
  enhanceApp({ app }) {
    app.component("HomePage", HomePage);
  },
} satisfies Theme;

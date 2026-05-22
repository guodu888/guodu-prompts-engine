import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Guodu Prompt Engine",
  description: "AI messages template engine for OpenAI-compatible chat/completions payloads",
  lang: "zh-CN",
  base: "/guodu-prompts-engine/",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "指南", link: "/guide/getting-started" },
      { text: "Playground", link: "/guide/playground" },
      { text: "CLI", link: "/guide/cli" },
      { text: "API", link: "/guide/api" },
      { text: "GitHub", link: "https://github.com" }
    ],
    sidebar: [
      {
        text: "开始",
        items: [
          { text: "项目介绍", link: "/" },
          { text: "快速开始", link: "/guide/getting-started" }
        ]
      },
      {
        text: "核心能力",
        items: [
          { text: "Playground", link: "/guide/playground" },
          { text: "模板语法", link: "/guide/template-syntax" },
          { text: "CLI", link: "/guide/cli" },
          { text: "Core API", link: "/guide/api" },
          { text: "Adapters", link: "/guide/adapters" }
        ]
      },
      {
        text: "工程实践",
        items: [{ text: "测试与发布", link: "/guide/testing-and-release" }]
      }
    ],
    socialLinks: [{ icon: "github", link: "https://github.com" }],
    search: {
      provider: "local"
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 Guodu Prompt Engine"
    }
  }
});

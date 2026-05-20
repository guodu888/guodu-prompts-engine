# Guodu Prompt Engine VS Code Extension

This extension adds first-party editing support for Guodu prompt templates. It is built on top of Markdown syntax and only applies to the `.gdprompt` suffix.

## Features

- Syntax highlighting for template tags and variables.
- Diagnostics for common syntax errors:
  - unknown tags
  - missing end tags
  - invalid role names
  - malformed include paths
  - invalid image block attributes
- Go-to-definition and clickable links for `{% include %}` file paths.
- Foldable blocks for `{% role %}`, `{% if %}`, and `{% image %}` pairs.
- Role tags highlight the `role` keyword and the `system/user/assistant` value separately.
- Variables are highlighted with stronger scopes for the delimiters, variable name, and default value.
- Snippet completions for role/if/include/image/variables.
- Hover docs for core tags.

## Markdown Base

The template files keep normal Markdown syntax such as headings, lists, emphasis, code fences, and links. On top of that, the extension adds custom template tags and validation.

## File extension

The language is automatically enabled for:

- `.gdprompt`

## Build

```bash
bun run --filter guodu-prompt-engine-vscode build
```

## Package VSIX

From the repository root, run:

```bash
bun run package:vscode
```

This generates a `.vsix` file inside `packages/vscode-extension` that can be installed in VS Code via "Install from VSIX".

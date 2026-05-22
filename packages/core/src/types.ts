export type MessageRole = "system" | "user" | "assistant" | "tool" | "tool_result";

export type ImageDetail = "low" | "high" | "auto";

export interface ImageContent {
  type: "image_url";
  image_url: {
    url: string;
    detail?: ImageDetail;
  };
}

export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolResultContent {
  type: "tool_result";
  tool_call_id: string;
  tool_name?: string;
  output: unknown;
  is_error?: boolean;
}

export type MessageContent = string | Array<TextContent | ImageContent | ToolResultContent>;

export interface Message {
  role: MessageRole;
  content: MessageContent;
}

export interface Cache<T = unknown> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
}

export type TemplateVariableValue = unknown | Promise<unknown>;

export type TemplateVariableResolver = (
  variablePath: string,
  variables: TemplateVariables
) => unknown | Promise<unknown>;

export interface TemplateEngineOptions {
  baseDir: string;
  cache?: Cache;
  strictUndefinedVariables?: boolean;
  variableResolver?: TemplateVariableResolver;
}

export type TemplateVariables = Record<string, TemplateVariableValue>;

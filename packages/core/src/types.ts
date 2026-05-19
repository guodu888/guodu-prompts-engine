export type MessageRole = "system" | "user" | "assistant";

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

export type MessageContent = string | Array<TextContent | ImageContent>;

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

export interface TemplateEngineOptions {
  baseDir: string;
  cache?: Cache;
  strictUndefinedVariables?: boolean;
}

export type TemplateVariables = Record<string, unknown>;

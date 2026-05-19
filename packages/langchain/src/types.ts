export type LangChainRole = "system" | "human" | "ai";

export interface LangChainContentTextPart {
  type: "text";
  text: string;
}

export interface LangChainContentImagePart {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export type LangChainMessageContent =
  | string
  | Array<LangChainContentTextPart | LangChainContentImagePart>;

export interface LangChainMessageLike {
  role: LangChainRole;
  content: LangChainMessageContent;
}

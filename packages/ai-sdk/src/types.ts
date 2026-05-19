export type AISDKRole = "system" | "user" | "assistant";

export interface AISDKTextPart {
  type: "text";
  text: string;
}

export interface AISDKImagePart {
  type: "image";
  image: string;
}

export type AISDKContent = string | Array<AISDKTextPart | AISDKImagePart>;

export interface AISDKMessage {
  role: AISDKRole;
  content: AISDKContent;
}

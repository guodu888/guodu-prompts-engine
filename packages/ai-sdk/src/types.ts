import type {
  AssistantContent,
  CoreMessage,
  ImagePart,
  TextPart,
  UserContent
} from "ai";

export type AISDKRole = CoreMessage["role"];
export type AISDKTextPart = TextPart;
export type AISDKImagePart = ImagePart;
export type AISDKContent = string | UserContent | AssistantContent;
export type AISDKMessage = CoreMessage;

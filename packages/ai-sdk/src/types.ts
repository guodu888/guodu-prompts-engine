import type {
  AssistantContent,
  CoreMessage,
  ImagePart,
  TextPart,
  ToolContent,
  ToolResultPart,
  UserContent
} from "ai";

export type AISDKRole = CoreMessage["role"];
export type AISDKTextPart = TextPart;
export type AISDKImagePart = ImagePart;
export type AISDKContent = string | UserContent | AssistantContent;
export type AISDKMessage = CoreMessage;
export type AISDKToolResultPart = ToolResultPart;
export type AISDKToolContent = ToolContent;

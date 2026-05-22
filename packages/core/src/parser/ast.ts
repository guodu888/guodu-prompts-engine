import type { ImageDetail, MessageRole } from "../types";

export interface TextNode {
  type: "text";
  value: string;
}

export interface RoleNode {
  type: "role";
  role: MessageRole;
  children: TemplateNode[];
}

export interface IncludeNode {
  type: "include";
  path: string;
}

export interface IfBranchNode {
  condition: string | null;
  children: TemplateNode[];
}

export interface IfNode {
  type: "if";
  branches: IfBranchNode[];
}

export interface ForNode {
  type: "for";
  itemName: string;
  iterableExpression: string;
  children: TemplateNode[];
}

export interface ImageNode {
  type: "image";
  urlExpression: string;
  detailExpression?: string;
}

export type TemplateNode = TextNode | RoleNode | IncludeNode | IfNode | ForNode | ImageNode;

export interface ParsedImageAttributes {
  urlExpression: string;
  detailExpression?: ImageDetail | string;
}

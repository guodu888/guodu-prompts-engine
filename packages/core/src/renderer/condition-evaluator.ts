import type { TemplateVariables } from "../types";
import { resolveVariableValue } from "./variable-resolver";

type ConditionValue = string | number | boolean;

function parseLiteral(raw: string, variables: TemplateVariables): ConditionValue {
  const value = raw.trim();

  const quoted = value.match(/^['\"]([\s\S]*)['\"]$/);
  if (quoted?.[1] !== undefined) {
    return quoted[1];
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsupported condition operand: ${value}`);
  }

  const rawVariableValue = variables[value];
  if (typeof rawVariableValue === "number" || typeof rawVariableValue === "boolean") {
    return rawVariableValue;
  }

  return resolveVariableValue(value, variables);
}

export function evaluateCondition(condition: string, variables: TemplateVariables): boolean {
  const match = condition.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=|>=|<=|>|<)\s*([\s\S]+)$/);
  if (!match) {
    throw new Error(`Unsupported condition expression: ${condition}`);
  }

  const leftValue = parseLiteral(match[1] ?? "", variables);
  const rightValue = parseLiteral(match[3] ?? "", variables);

  if (match[2] === "==") {
    return String(leftValue) === String(rightValue);
  }

  if (match[2] === "!=") {
    return String(leftValue) !== String(rightValue);
  }

  if (typeof leftValue !== "number" || typeof rightValue !== "number") {
    throw new Error(`Operator ${match[2]} requires numeric operands.`);
  }

  if (match[2] === ">") {
    return leftValue > rightValue;
  }

  if (match[2] === "<") {
    return leftValue < rightValue;
  }

  if (match[2] === ">=") {
    return leftValue >= rightValue;
  }

  return leftValue <= rightValue;
}

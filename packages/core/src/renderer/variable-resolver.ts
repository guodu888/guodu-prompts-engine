import type { TemplateVariables } from "../types";

export interface VariableResolverOptions {
  strictUndefined?: boolean;
}

function normalizeVariableName(rawName: string): string {
  const name = rawName.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid variable name: ${rawName}`);
  }

  return name;
}

export function resolveVariableValue(
  variableName: string,
  variables: TemplateVariables,
  options: VariableResolverOptions = {},
  defaultValue?: string
): string {
  const normalizedName = normalizeVariableName(variableName);
  const value = variables[normalizedName];

  if (value === undefined) {
    if (defaultValue !== undefined) {
      if (defaultValue.includes("{{")) {
        throw new Error("Nested variable defaults are not supported.");
      }
      return defaultValue;
    }

    if (options.strictUndefined) {
      throw new Error(`Missing variable: ${normalizedName}`);
    }

    return "";
  }

  if (value === null) {
    return "";
  }

  return String(value);
}

export function resolveTemplateString(
  template: string,
  variables: TemplateVariables,
  options: VariableResolverOptions = {}
): string {
  if (/{{\s*[A-Za-z_][A-Za-z0-9_]*\s*\|\s*{{/.test(template)) {
    throw new Error("Nested variable defaults are not supported.");
  }

  return template.replace(/{{\s*([^{}|]+?)\s*(?:\|\s*([^{}]*?)\s*)?}}/g, (_, rawName: string, rawDefault?: string) => {
    return resolveVariableValue(rawName, variables, options, rawDefault);
  });
}

import type { TemplateVariables } from "../types";

export interface VariableResolverOptions {
  strictUndefined?: boolean;
  variableResolver?: (variablePath: string, variables: TemplateVariables) => unknown | Promise<unknown>;
}

function normalizeVariablePath(rawPath: string): string {
  const path = rawPath.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(path)) {
    throw new Error(`Invalid variable name: ${rawPath}`);
  }

  return path;
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return !!value && typeof value === "object" && typeof (value as { then?: unknown }).then === "function";
}

function readPathSync(path: string, variables: TemplateVariables): unknown {
  const segments = path.split(".");
  let current: unknown = variables;

  for (const segment of segments) {
    if (isPromiseLike(current)) {
      throw new Error(
        `Variable ${path} is async and cannot be resolved in sync mode. Use TemplateEngine.render for async variables.`
      );
    }

    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  if (isPromiseLike(current)) {
    throw new Error(
      `Variable ${path} is async and cannot be resolved in sync mode. Use TemplateEngine.render for async variables.`
    );
  }

  return current;
}

async function readPathAsync(path: string, variables: TemplateVariables): Promise<unknown> {
  const segments = path.split(".");
  let current: unknown = variables;

  for (const segment of segments) {
    if (isPromiseLike(current)) {
      current = await current;
    }

    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  if (isPromiseLike(current)) {
    return current;
  }

  return current;
}

export function resolveVariableRawValue(
  variablePath: string,
  variables: TemplateVariables,
  options: VariableResolverOptions = {}
): unknown {
  const normalizedPath = normalizeVariablePath(variablePath);
  let value = readPathSync(normalizedPath, variables);

  if (value === undefined && options.variableResolver) {
    value = options.variableResolver(normalizedPath, variables);
    if (isPromiseLike(value)) {
      throw new Error(
        `Variable ${normalizedPath} is async and cannot be resolved in sync mode. Use TemplateEngine.render for async variables.`
      );
    }
  }

  return value;
}

export async function resolveVariableRawValueAsync(
  variablePath: string,
  variables: TemplateVariables,
  options: VariableResolverOptions = {}
): Promise<unknown> {
  const normalizedPath = normalizeVariablePath(variablePath);
  let value = await readPathAsync(normalizedPath, variables);

  if (value === undefined && options.variableResolver) {
    value = await options.variableResolver(normalizedPath, variables);
  }

  if (isPromiseLike(value)) {
    return await value;
  }

  return value;
}

export function resolveVariableValue(
  variableName: string,
  variables: TemplateVariables,
  options: VariableResolverOptions = {},
  defaultValue?: string
): string {
  const normalizedName = normalizeVariablePath(variableName);
  const value = resolveVariableRawValue(normalizedName, variables, options);

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

export async function resolveVariableValueAsync(
  variableName: string,
  variables: TemplateVariables,
  options: VariableResolverOptions = {},
  defaultValue?: string
): Promise<string> {
  const normalizedName = normalizeVariablePath(variableName);
  const value = await resolveVariableRawValueAsync(normalizedName, variables, options);

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

export async function resolveTemplateStringAsync(
  template: string,
  variables: TemplateVariables,
  options: VariableResolverOptions = {}
): Promise<string> {
  if (/{{\s*[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*\s*\|\s*{{/.test(template)) {
    throw new Error("Nested variable defaults are not supported.");
  }

  const pattern = /{{\s*([^{}|]+?)\s*(?:\|\s*([^{}]*?)\s*)?}}/g;
  let output = "";
  let lastIndex = 0;

  while (true) {
    const match = pattern.exec(template);
    if (!match) {
      break;
    }

    output += template.slice(lastIndex, match.index);
    output += await resolveVariableValueAsync(match[1] ?? "", variables, options, match[2]);
    lastIndex = pattern.lastIndex;
  }

  output += template.slice(lastIndex);
  return output;
}

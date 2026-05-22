import type { TemplateVariables } from "../types";
import {
  resolveVariableRawValue,
  resolveVariableRawValueAsync
} from "./variable-resolver";

interface EvaluatorOptions {
  variableResolver?: (variablePath: string, variables: TemplateVariables) => unknown | Promise<unknown>;
}

function isVariablePath(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(value);
}

function toBoolean(value: unknown): boolean {
  return Boolean(value);
}

function parseLiteral(raw: string, variables: TemplateVariables, options: EvaluatorOptions = {}): unknown {
  const value = raw.trim();

  const quoted = value.match(/^['"]([\s\S]*)['"]$/);
  if (quoted?.[1] !== undefined) return quoted[1];
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  if (!isVariablePath(value)) {
    throw new Error(`Unsupported condition operand: ${value}`);
  }

  return resolveVariableRawValue(value, variables, {
    variableResolver: options.variableResolver
  });
}

async function parseLiteralAsync(
  raw: string,
  variables: TemplateVariables,
  options: EvaluatorOptions = {}
): Promise<unknown> {
  const value = raw.trim();

  const quoted = value.match(/^['"]([\s\S]*)['"]$/);
  if (quoted?.[1] !== undefined) return quoted[1];
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  if (!isVariablePath(value)) {
    throw new Error(`Unsupported condition operand: ${value}`);
  }

  return resolveVariableRawValueAsync(value, variables, {
    variableResolver: options.variableResolver
  });
}

function evaluateSimpleComparison(
  expr: string,
  variables: TemplateVariables,
  options: EvaluatorOptions = {}
): boolean {
  const inMatch = expr.match(/^([\s\S]+?)\s+in\s+([\s\S]+)$/);
  if (inMatch) {
    const leftValue = parseLiteral(inMatch[1] ?? "", variables, options);
    const rightValue = parseLiteral(inMatch[2] ?? "", variables, options);

    if (Array.isArray(rightValue)) return rightValue.some((item) => item === leftValue);
    if (typeof rightValue === "string") return rightValue.includes(String(leftValue ?? ""));
    if (rightValue && typeof rightValue === "object") return String(leftValue) in rightValue;

    throw new Error("Operator in requires an array, string, or object operand on the right side.");
  }

  const match = expr.match(/^([\s\S]+?)\s*(==|!=|>=|<=|>|<)\s*([\s\S]+)$/);
  if (!match) {
    return toBoolean(parseLiteral(expr, variables, options));
  }

  const leftValue = parseLiteral(match[1] ?? "", variables, options);
  const rightValue = parseLiteral(match[3] ?? "", variables, options);

  if (match[2] === "==") return String(leftValue) === String(rightValue);
  if (match[2] === "!=") return String(leftValue) !== String(rightValue);

  if (typeof leftValue !== "number" || typeof rightValue !== "number") {
    throw new Error(`Operator ${match[2]} requires numeric operands.`);
  }

  if (match[2] === ">") return leftValue > rightValue;
  if (match[2] === "<") return leftValue < rightValue;
  if (match[2] === ">=") return leftValue >= rightValue;
  return leftValue <= rightValue;
}

async function evaluateSimpleComparisonAsync(
  expr: string,
  variables: TemplateVariables,
  options: EvaluatorOptions = {}
): Promise<boolean> {
  const inMatch = expr.match(/^([\s\S]+?)\s+in\s+([\s\S]+)$/);
  if (inMatch) {
    const leftValue = await parseLiteralAsync(inMatch[1] ?? "", variables, options);
    const rightValue = await parseLiteralAsync(inMatch[2] ?? "", variables, options);

    if (Array.isArray(rightValue)) return rightValue.some((item) => item === leftValue);
    if (typeof rightValue === "string") return rightValue.includes(String(leftValue ?? ""));
    if (rightValue && typeof rightValue === "object") return String(leftValue) in rightValue;

    throw new Error("Operator in requires an array, string, or object operand on the right side.");
  }

  const match = expr.match(/^([\s\S]+?)\s*(==|!=|>=|<=|>|<)\s*([\s\S]+)$/);
  if (!match) {
    return toBoolean(await parseLiteralAsync(expr, variables, options));
  }

  const leftValue = await parseLiteralAsync(match[1] ?? "", variables, options);
  const rightValue = await parseLiteralAsync(match[3] ?? "", variables, options);

  if (match[2] === "==") return String(leftValue) === String(rightValue);
  if (match[2] === "!=") return String(leftValue) !== String(rightValue);

  if (typeof leftValue !== "number" || typeof rightValue !== "number") {
    throw new Error(`Operator ${match[2]} requires numeric operands.`);
  }

  if (match[2] === ">") return leftValue > rightValue;
  if (match[2] === "<") return leftValue < rightValue;
  if (match[2] === ">=") return leftValue >= rightValue;
  return leftValue <= rightValue;
}

type Token =
  | { type: "AND" }
  | { type: "OR" }
  | { type: "NOT" }
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "EXPR"; value: string };

function tokenize(condition: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < condition.length) {
    if (/\s/.test(condition[i]!)) {
      i += 1;
      continue;
    }

    if (condition[i] === "&" && condition[i + 1] === "&") {
      tokens.push({ type: "AND" });
      i += 2;
      continue;
    }

    if (condition[i] === "|" && condition[i + 1] === "|") {
      tokens.push({ type: "OR" });
      i += 2;
      continue;
    }

    if (condition[i] === "(") {
      tokens.push({ type: "LPAREN" });
      i += 1;
      continue;
    }

    if (condition[i] === ")") {
      tokens.push({ type: "RPAREN" });
      i += 1;
      continue;
    }

    if (condition[i] === "!" && condition[i + 1] !== "=") {
      tokens.push({ type: "NOT" });
      i += 1;
      continue;
    }

    const start = i;
    while (i < condition.length) {
      const ch = condition[i]!;
      if (
        ch === "(" ||
        ch === ")" ||
        (ch === "!" && condition[i + 1] !== "=") ||
        (ch === "&" && condition[i + 1] === "&") ||
        (ch === "|" && condition[i + 1] === "|")
      ) {
        break;
      }

      if (ch === '"' || ch === "'") {
        const quote = ch;
        i += 1;
        while (i < condition.length && condition[i] !== quote) {
          i += 1;
        }
        i += 1;
        continue;
      }

      i += 1;
    }

    const expr = condition.slice(start, i).trim();
    if (expr) {
      tokens.push({ type: "EXPR", value: expr });
    }
  }

  return tokens;
}

class ConditionParser {
  private readonly tokens: Token[];
  private pos = 0;
  private readonly variables: TemplateVariables;
  private readonly options: EvaluatorOptions;

  constructor(tokens: Token[], variables: TemplateVariables, options: EvaluatorOptions = {}) {
    this.tokens = tokens;
    this.variables = variables;
    this.options = options;
  }

  parse(): boolean {
    const result = this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token in condition at position ${this.pos}`);
    }
    return result;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const token = this.tokens[this.pos++];
    if (!token) {
      throw new Error("Unexpected end of condition expression");
    }
    return token;
  }

  private parseOr(): boolean {
    let result = this.parseAnd();
    while (this.peek()?.type === "OR") {
      this.consume();
      const right = this.parseAnd();
      result = result || right;
    }
    return result;
  }

  private parseAnd(): boolean {
    let result = this.parseNot();
    while (this.peek()?.type === "AND") {
      this.consume();
      const right = this.parseNot();
      result = result && right;
    }
    return result;
  }

  private parseNot(): boolean {
    if (this.peek()?.type === "NOT") {
      this.consume();
      return !this.parseNot();
    }
    return this.parseAtom();
  }

  private parseAtom(): boolean {
    const token = this.peek();
    if (!token) {
      throw new Error("Unexpected end of condition expression");
    }

    if (token.type === "LPAREN") {
      this.consume();
      const result = this.parseOr();
      const closing = this.consume();
      if (closing.type !== "RPAREN") {
        throw new Error("Expected closing parenthesis ')'");
      }
      return result;
    }

    if (token.type === "EXPR") {
      this.consume();
      return evaluateSimpleComparison(token.value, this.variables, this.options);
    }

    throw new Error(`Unexpected token type: ${token.type}`);
  }
}

class AsyncConditionParser {
  private readonly tokens: Token[];
  private pos = 0;
  private readonly variables: TemplateVariables;
  private readonly options: EvaluatorOptions;

  constructor(tokens: Token[], variables: TemplateVariables, options: EvaluatorOptions = {}) {
    this.tokens = tokens;
    this.variables = variables;
    this.options = options;
  }

  async parse(): Promise<boolean> {
    const result = await this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token in condition at position ${this.pos}`);
    }
    return result;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const token = this.tokens[this.pos++];
    if (!token) {
      throw new Error("Unexpected end of condition expression");
    }
    return token;
  }

  private async parseOr(): Promise<boolean> {
    let result = await this.parseAnd();
    while (this.peek()?.type === "OR") {
      this.consume();
      const right = await this.parseAnd();
      result = result || right;
    }
    return result;
  }

  private async parseAnd(): Promise<boolean> {
    let result = await this.parseNot();
    while (this.peek()?.type === "AND") {
      this.consume();
      const right = await this.parseNot();
      result = result && right;
    }
    return result;
  }

  private async parseNot(): Promise<boolean> {
    if (this.peek()?.type === "NOT") {
      this.consume();
      return !(await this.parseNot());
    }
    return this.parseAtom();
  }

  private async parseAtom(): Promise<boolean> {
    const token = this.peek();
    if (!token) {
      throw new Error("Unexpected end of condition expression");
    }

    if (token.type === "LPAREN") {
      this.consume();
      const result = await this.parseOr();
      const closing = this.consume();
      if (closing.type !== "RPAREN") {
        throw new Error("Expected closing parenthesis ')'");
      }
      return result;
    }

    if (token.type === "EXPR") {
      this.consume();
      return evaluateSimpleComparisonAsync(token.value, this.variables, this.options);
    }

    throw new Error(`Unexpected token type: ${token.type}`);
  }
}

export function evaluateCondition(condition: string, variables: TemplateVariables): boolean {
  const tokens = tokenize(condition);
  const parser = new ConditionParser(tokens, variables);
  return parser.parse();
}

export async function evaluateConditionAsync(
  condition: string,
  variables: TemplateVariables,
  options: EvaluatorOptions = {}
): Promise<boolean> {
  const tokens = tokenize(condition);
  const parser = new AsyncConditionParser(tokens, variables, options);
  return parser.parse();
}

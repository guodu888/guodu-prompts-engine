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

function evaluateSimpleComparison(expr: string, variables: TemplateVariables): boolean {
  const match = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=|>=|<=|>|<)\s*([\s\S]+)$/);
  if (!match) {
    throw new Error(`Unsupported condition expression: ${expr}`);
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

// Token types for the condition expression tokenizer
type Token =
  | { type: "AND" }
  | { type: "OR" }
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "EXPR"; value: string };

/**
 * Tokenizes a condition string into AND, OR, parenthesis, and expression tokens.
 * Quoted string literals inside expressions are handled correctly and their
 * contents are never mistaken for operators.
 */
function tokenize(condition: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < condition.length) {
    // Skip whitespace
    if (/\s/.test(condition[i]!)) {
      i++;
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
      i++;
      continue;
    }

    if (condition[i] === ")") {
      tokens.push({ type: "RPAREN" });
      i++;
      continue;
    }

    // Accumulate characters into an expression token, respecting quoted strings
    const start = i;
    while (i < condition.length) {
      const ch = condition[i]!;
      if (
        ch === "(" ||
        ch === ")" ||
        (ch === "&" && condition[i + 1] === "&") ||
        (ch === "|" && condition[i + 1] === "|")
      ) {
        break;
      }
      // Skip over quoted string literals so their contents aren't misinterpreted
      if (ch === '"' || ch === "'") {
        const quote = ch;
        i++;
        while (i < condition.length && condition[i] !== quote) {
          i++;
        }
        i++; // consume closing quote
        continue;
      }
      i++;
    }

    const expr = condition.slice(start, i).trim();
    if (expr) {
      tokens.push({ type: "EXPR", value: expr });
    }
  }

  return tokens;
}

/**
 * Recursive descent parser for boolean condition expressions.
 *
 * Grammar:
 *   expression := or_expr
 *   or_expr    := and_expr ('||' and_expr)*
 *   and_expr   := atom    ('&&' atom)*
 *   atom       := '(' expression ')' | EXPR
 */
class ConditionParser {
  private readonly tokens: Token[];
  private pos = 0;
  private readonly variables: TemplateVariables;

  constructor(tokens: Token[], variables: TemplateVariables) {
    this.tokens = tokens;
    this.variables = variables;
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
    let result = this.parseAtom();
    while (this.peek()?.type === "AND") {
      this.consume();
      const right = this.parseAtom();
      result = result && right;
    }
    return result;
  }

  private parseAtom(): boolean {
    const token = this.peek();
    if (!token) {
      throw new Error("Unexpected end of condition expression");
    }

    if (token.type === "LPAREN") {
      this.consume(); // consume '('
      const result = this.parseOr();
      const closing = this.consume();
      if (closing.type !== "RPAREN") {
        throw new Error("Expected closing parenthesis ')'");
      }
      return result;
    }

    if (token.type === "EXPR") {
      this.consume();
      return evaluateSimpleComparison(token.value, this.variables);
    }

    throw new Error(`Unexpected token type: ${token.type}`);
  }
}

export function evaluateCondition(condition: string, variables: TemplateVariables): boolean {
  const tokens = tokenize(condition);
  const parser = new ConditionParser(tokens, variables);
  return parser.parse();
}

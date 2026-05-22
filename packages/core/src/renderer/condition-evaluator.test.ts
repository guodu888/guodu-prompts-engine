import { expect, test } from "bun:test";
import { evaluateCondition, evaluateConditionAsync } from "./condition-evaluator";

test("evaluates equals for string literal", () => {
  expect(evaluateCondition('level == "advanced"', { level: "advanced" })).toBe(true);
  expect(evaluateCondition('level == "advanced"', { level: "basic" })).toBe(false);
});

test("evaluates not equals", () => {
  expect(evaluateCondition("score != 100", { score: 100 })).toBe(false);
  expect(evaluateCondition("score != 100", { score: 95 })).toBe(true);
});

test("supports variable-to-variable compare", () => {
  expect(evaluateCondition("a == b", { a: "x", b: "x" })).toBe(true);
  expect(evaluateCondition("a == b", { a: "x", b: "y" })).toBe(false);
});

test("supports && operator", () => {
  expect(evaluateCondition('level == "advanced" && score > 60', { level: "advanced", score: 80 })).toBe(true);
  expect(evaluateCondition('level == "advanced" && score > 60', { level: "advanced", score: 50 })).toBe(false);
  expect(evaluateCondition('level == "basic" && score > 60', { level: "advanced", score: 80 })).toBe(false);
});

test("supports || operator", () => {
  expect(evaluateCondition('level == "advanced" || level == "expert"', { level: "advanced" })).toBe(true);
  expect(evaluateCondition('level == "advanced" || level == "expert"', { level: "expert" })).toBe(true);
  expect(evaluateCondition('level == "advanced" || level == "expert"', { level: "basic" })).toBe(false);
});

test("supports parentheses for grouping", () => {
  expect(evaluateCondition('(level == "advanced" || level == "expert") && score > 60', { level: "advanced", score: 80 })).toBe(true);
  expect(evaluateCondition('(level == "advanced" || level == "expert") && score > 60', { level: "basic", score: 80 })).toBe(false);
  expect(evaluateCondition('(level == "advanced" || level == "expert") && score > 60', { level: "advanced", score: 50 })).toBe(false);
});

test("supports nested parentheses", () => {
  expect(evaluateCondition('((a == 1 || a == 2) && (b == 3 || b == 4))', { a: 1, b: 3 })).toBe(true);
  expect(evaluateCondition('((a == 1 || a == 2) && (b == 3 || b == 4))', { a: 1, b: 5 })).toBe(false);
});

test("&& has higher precedence than ||", () => {
  // a || b && c  =>  a || (b && c)
  expect(evaluateCondition('a == 1 || b == 2 && c == 3', { a: 1, b: 9, c: 9 })).toBe(true);
  expect(evaluateCondition('a == 1 || b == 2 && c == 3', { a: 9, b: 2, c: 3 })).toBe(true);
  expect(evaluateCondition('a == 1 || b == 2 && c == 3', { a: 9, b: 2, c: 9 })).toBe(false);
});

test("supports numeric comparison operators", () => {
  expect(evaluateCondition("score > 60", { score: 61 })).toBe(true);
  expect(evaluateCondition("score >= 60", { score: 60 })).toBe(true);
  expect(evaluateCondition("score < 60", { score: 59 })).toBe(true);
  expect(evaluateCondition("score <= 60", { score: 60 })).toBe(true);
});

test("throws when numeric operator uses non-number operand", () => {
  expect(() => evaluateCondition('score > "60"', { score: 61 })).toThrow(
    "requires numeric operands"
  );
});

test("supports boolean literal operands", () => {
  expect(evaluateCondition("flag == true", { flag: true })).toBe(true);
  expect(evaluateCondition("flag == false", { flag: false })).toBe(true);
  expect(evaluateCondition("flag != false", { flag: true })).toBe(true);
});

test("throws for unsupported condition operand token", () => {
  expect(() => evaluateCondition("score == @bad", { score: 1 })).toThrow(
    "Unsupported condition operand"
  );
});

test("supports unary not operator", () => {
  expect(evaluateCondition("!flag", { flag: false })).toBe(true);
  expect(evaluateCondition("!!flag", { flag: true })).toBe(true);
  expect(evaluateCondition("!(a == 1)", { a: 1 })).toBe(false);
});

test("supports in operator", () => {
  expect(evaluateCondition("item in items", { item: "a", items: ["a", "b"] })).toBe(true);
  expect(evaluateCondition('"name" in user', { user: { name: "alice" } })).toBe(true);
  expect(evaluateCondition('"x" in "xyz"', {})).toBe(true);
});

test("supports dot-path operands", () => {
  expect(evaluateCondition('user.level == "advanced"', { user: { level: "advanced" } })).toBe(true);
});

test("supports async condition evaluation", async () => {
  const result = await evaluateConditionAsync("user.active && score >= 60", {
    user: Promise.resolve({ active: true }),
    score: Promise.resolve(90)
  });
  expect(result).toBe(true);
});

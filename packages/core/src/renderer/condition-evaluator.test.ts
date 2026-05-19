import { expect, test } from "bun:test";
import { evaluateCondition } from "./condition-evaluator";

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

test("throws for unsupported syntax", () => {
  expect(() => evaluateCondition("a && b", { a: 1, b: 1 })).toThrow("Unsupported condition expression");
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

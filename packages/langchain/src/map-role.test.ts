import { expect, test } from "bun:test";
import { mapLangChainRole } from "./map-role";

test("maps message roles to langchain roles", () => {
  expect(mapLangChainRole("system")).toBe("system");
  expect(mapLangChainRole("user")).toBe("human");
  expect(mapLangChainRole("assistant")).toBe("ai");
  expect(mapLangChainRole("tool")).toBe("tool");
  expect(mapLangChainRole("tool_result")).toBe("tool");
});

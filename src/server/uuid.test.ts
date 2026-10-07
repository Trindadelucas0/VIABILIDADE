import { describe, expect, it } from "vitest";
import { isUuid } from "./uuid";

describe("isUuid", () => {
  it("aceita UUID v4 gerado pelo banco", () => {
    expect(isUuid("94a149b3-d828-4a10-82a6-5a4aa4063137")).toBe(true);
  });

  it("rejeita id que não é UUID", () => {
    expect(isUuid("events")).toBe(false);
    expect(isUuid("94a149b3-d828-4a10-82a65-a4aa4063137")).toBe(false);
  });
});
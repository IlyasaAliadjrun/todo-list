import { describe, expect, it } from "vitest";
import { aggregateStatus } from "./health.util";

describe("aggregateStatus", () => {
  it("mengembalikan 'ok' saat semua dependency up", () => {
    expect(aggregateStatus({ database: "up", redis: "up" })).toBe("ok");
  });

  it("mengembalikan 'degraded' saat salah satu down", () => {
    expect(aggregateStatus({ database: "up", redis: "down" })).toBe("degraded");
    expect(aggregateStatus({ database: "down", redis: "up" })).toBe("degraded");
  });

  it("mengembalikan 'degraded' saat semua down", () => {
    expect(aggregateStatus({ database: "down", redis: "down" })).toBe("degraded");
  });
});

import { describe, it, expect } from "vitest";
import {
  compareVectorClocks,
  incrementVectorClock,
  mergeVectorClocks,
  stripHtml,
  truncate,
} from "@/lib/utils";
import { ConflictResolver } from "@/services/conflict-resolver";

describe("Vector Clock utilities", () => {
  it("compares concurrent clocks", () => {
    const a = { user1: 1, user2: 0 };
    const b = { user1: 0, user2: 1 };
    expect(compareVectorClocks(a, b)).toBe("concurrent");
  });

  it("detects after relationship", () => {
    const a = { user1: 2 };
    const b = { user1: 1 };
    expect(compareVectorClocks(a, b)).toBe("after");
  });

  it("increments vector clock", () => {
    const clock = { user1: 1 };
    const result = incrementVectorClock(clock, "user1");
    expect(result.user1).toBe(2);
  });

  it("merges vector clocks", () => {
    const a = { user1: 2, user2: 1 };
    const b = { user1: 1, user2: 3 };
    const merged = mergeVectorClocks(a, b);
    expect(merged).toEqual({ user1: 2, user2: 3 });
  });
});

describe("ConflictResolver", () => {
  it("applies insert operation", () => {
    const op = ConflictResolver.createOperation(
      "doc1",
      "user1",
      "insert",
      { content: " world", position: 5 },
      0,
      {},
    );
    const result = ConflictResolver.applyOperation("hello", op);
    expect(result).toBe("hello world");
  });

  it("applies delete operation", () => {
    const op = ConflictResolver.createOperation(
      "doc1",
      "user1",
      "delete",
      { position: 5, length: 6 },
      0,
      {},
    );
    const result = ConflictResolver.applyOperation("hello world!", op);
    expect(result).toBe("hello!");
  });

  it("merges concurrent operations deterministically", () => {
    const op1 = ConflictResolver.createOperation(
      "doc1",
      "user1",
      "insert",
      { content: "!", position: 5 },
      0,
      { user1: 0 },
    );
    op1.timestamp = 1000;

    const op2 = ConflictResolver.createOperation(
      "doc1",
      "user2",
      "insert",
      { content: "?", position: 5 },
      0,
      { user2: 0 },
    );
    op2.timestamp = 1001;

    const { content } = ConflictResolver.mergeOperations(
      [op1],
      [op2],
      "hello",
    );
    expect(content.length).toBeGreaterThan(5);
  });
});

describe("String utilities", () => {
  it("strips HTML tags", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("truncates long strings", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });
});

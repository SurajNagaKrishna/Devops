import { describe, expect, it } from "vitest";
import { apiErrorDetails, apiErrorMessage } from "./api";

describe("safe API error messages", () => {
  it.each([
    [400, "Invalid request"],
    [401, "session has expired"],
    [403, "permission"],
    [404, "No team is currently assigned to you."],
    [409, "already registered"],
    [500, "server error"],
  ])("maps HTTP %s to a user-safe message", (status, expected) => {
    const error = { response: { status, data: { message: status === 404 ? "No team is currently assigned to you." : "safe backend message" } } };
    expect(apiErrorMessage(error, "fallback")).toMatch(new RegExp(expected, "i"));
  });

  it("returns a retryable connection state for network failures", () => {
    const details = apiErrorDetails(new Error("Network Error"));
    expect(details.title).toBe("Connection problem");
    expect(details.retryable).toBe(true);
  });

  it("never exposes PostgreSQL internals", () => {
    const error = { response: { status: 500, data: { message: "ERROR code: 22001 routine: varchar" } } };
    const message = apiErrorMessage(error, "fallback");
    expect(message).not.toMatch(/22001|varchar|routine|ERROR/i);
    expect(message).toMatch(/server error|try again/i);
  });
});

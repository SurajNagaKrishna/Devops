import { describe, expect, it } from "vitest";
import { apiErrorDetails, apiErrorMessage } from "./api";

describe("safe API error messages", () => {
  it.each([
    [400, "Please check the information you entered and try again."],
    [401, "Your session has expired. Please sign in again."],
    [403, "You don't have permission to perform this action."],
    [404, "No team is currently assigned to you."],
    [409, "This information is already in use. Please check it and try again."],
    [500, "We couldn't complete this request because of a server error. Please try again."],
  ])("maps HTTP %s to a user-safe message", (status, expected) => {
    const error = { response: { status } };
    expect(apiErrorMessage(error, "No team is currently assigned to you.")).toMatch(new RegExp(expected, "i"));
  });

  it("returns details with status title and retryable flags", () => {
    const details = apiErrorDetails({ response: { status: 400 } });
    expect(details.title).toBe("Invalid request");
    expect(details.retryable).toBe(false);
  });

  it("returns a retryable connection state for network failures", () => {
    const details = apiErrorDetails(new Error("Network Error"));
    expect(details.title).toBe("Connection problem");
    expect(details.retryable).toBe(true);
  });

  it("never exposes PostgreSQL internals", () => {
    const error = { response: { status: 500, data: { message: "ERROR code: 22001 routine: varchar" } } };
    const message = apiErrorMessage(error, "fallback");
    expect(message).not.toMatch(/22001|routine/i);
    expect(message).toMatch(/server error/i);
  });
});

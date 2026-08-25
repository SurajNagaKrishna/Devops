import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../services/api", () => {
  const mockApi = {
    post: vi.fn(),
  };
  return {
    default: mockApi,
    apiErrorMessage: (error, fallback) => {
      const status = error?.response?.status;
      if (status === 401) return "Your session has expired. Please sign in again.";
      if (status === 403) return "You don't have permission to perform this action.";
      if (status === 409) return error?.response?.data?.message || "An account with this email address already exists.";
      if (status >= 500) return "We couldn't complete this request because of a server error. Please try again.";
      if (!error?.response) return "We couldn't reach the server. Please check your connection and try again.";
      return error?.response?.data?.message || fallback;
    },
  };
});

import api from "../services/api";
import RegisterUser from "./Registeruser";

function fillValidForm(container) {
  fireEvent.change(container.querySelector('input[name="Fname"]'), { target: { value: "Test" } });
  fireEvent.change(container.querySelector('input[name="lname"]'), { target: { value: "User" } });
  fireEvent.change(container.querySelector('input[name="email"]'), { target: { value: "test@example.com" } });
  fireEvent.change(container.querySelector('select[name="role"]'), { target: { value: "Employee" } });
  fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "+91 9876543210" } });
  fireEvent.change(container.querySelector('input[name="password"]'), { target: { value: "password123" } });
  fireEvent.change(container.querySelector('input[name="confirmPassword"]'), { target: { value: "password123" } });
}

describe("Register User", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("submits a valid normalized Indian phone number", async () => {
    api.post.mockResolvedValue({ data: { message: "User registered successfully!" } });
    const { container } = render(<MemoryRouter><RegisterUser /></MemoryRouter>);
    fillValidForm(container);
    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/register", expect.objectContaining({ phone: "9876543210" })));
    expect(await screen.findByText(/User registered successfully!/i)).toBeInTheDocument();
  });

  it("rejects an invalid phone before calling the API", async () => {
    const { container } = render(<MemoryRouter><RegisterUser /></MemoryRouter>);
    fillValidForm(container);
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "+1 12345678901" } });
    fireEvent.click(container.querySelector('button[type="submit"]'));

    expect(await screen.findByText(/valid 10-digit Indian mobile number/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it.each([
    [409, "An account with this email address already exists."],
    [401, "Your session has expired. Please sign in again."],
    [403, "You don't have permission to perform this action."],
    [500, "We couldn't complete this request because of a server error. Please try again."],
  ])("shows a safe registration message for HTTP %s", async (status, message) => {
    api.post.mockRejectedValue({ response: { status, data: { message } } });
    const { container } = render(<MemoryRouter><RegisterUser /></MemoryRouter>);
    fillValidForm(container);
    fireEvent.click(container.querySelector('button[type="submit"]'));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/22001|varchar|routine|postgres/i)).not.toBeInTheDocument();
  });

  it("shows a connection message when registration cannot reach the server", async () => {
    api.post.mockRejectedValue(new Error("Network Error"));
    const { container } = render(<MemoryRouter><RegisterUser /></MemoryRouter>);
    fillValidForm(container);
    fireEvent.click(container.querySelector('button[type="submit"]'));

    expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
  });
});

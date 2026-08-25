import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const { api } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("../services/api", () => ({
  default: api,
  apiErrorMessage: (error, fallback) => {
    const status = error.response?.status;
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403) return "You don't have permission to perform this action.";
    if (status === 409) return error.response?.data?.message || "This email address is already registered.";
    if (status >= 500) return "We couldn't complete this request because of a server error. Please try again.";
    if (!error.response) return "We couldn't reach the server. Please check your connection and try again.";
    return error.response?.data?.message || fallback;
  },
}));

import RegisterUser from "./Registeruser";

function fillValidForm() {
  fireEvent.change(screen.getByRole("textbox", { name: /first name/i }), { target: { value: "Test" } });
  fireEvent.change(screen.getByRole("textbox", { name: /last name/i }), { target: { value: "User" } });
  fireEvent.change(screen.getByRole("textbox", { name: /email address/i }), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByRole("combobox", { name: /role/i }), { target: { value: "Employee" } });
  fireEvent.change(screen.getByRole("textbox", { name: /phone/i }), { target: { value: "+91 9876543210" } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "password123" } });
  fireEvent.change(screen.getByLabelText(/Confirm Password/), { target: { value: "password123" } });
}

describe("Register User", () => {
  it("submits a valid normalized Indian phone number", async () => {
    api.post.mockResolvedValue({ data: { message: "User registered successfully" } });
    render(<MemoryRouter><RegisterUser /></MemoryRouter>);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /register user/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/register", expect.objectContaining({ phone: "9876543210" })));
    expect(await screen.findByText(/User registered successfully/i)).toBeInTheDocument();
  });

  it("rejects an invalid phone before calling the API", async () => {
    render(<MemoryRouter><RegisterUser /></MemoryRouter>);
    fillValidForm();
    fireEvent.change(screen.getByRole("textbox", { name: /phone/i }), { target: { value: "+1 12345678901" } });
    fireEvent.click(screen.getByRole("button", { name: /register user/i }));

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
    render(<MemoryRouter><RegisterUser /></MemoryRouter>);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /register user/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/22001|varchar|routine|postgres/i)).not.toBeInTheDocument();
  });

  it("shows a connection message when registration cannot reach the server", async () => {
    api.post.mockRejectedValue(new Error("Network Error"));
    render(<MemoryRouter><RegisterUser /></MemoryRouter>);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /register user/i }));

    expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
  });
});

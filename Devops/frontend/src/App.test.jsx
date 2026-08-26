import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn() },
}));

vi.mock("./services/api", () => ({ default: api }));

vi.mock("./pages/Login", () => ({
  default: () => <div data-testid="login-page">Login page</div>,
}));

vi.mock("./pages/AdminDashboard", () => ({
  default: () => <div data-testid="admin-page">Admin dashboard</div>,
}));

vi.mock("./pages/EmployeeDashboard", () => ({
  default: () => <div data-testid="employee-page">Employee dashboard</div>,
}));

vi.mock("./pages/Overview", () => ({ default: () => null }));
vi.mock("./pages/Teams", () => ({ default: () => null }));
vi.mock("./pages/CreateTeam", () => ({ default: () => null }));
vi.mock("./pages/Registeruser", () => ({ default: () => null }));
vi.mock("./pages/Manageroverview", () => ({ default: () => null }));
vi.mock("./pages/Managerteam", () => ({ default: () => null }));
vi.mock("./pages/Managertasks", () => ({ default: () => null }));

vi.mock("./pages/Employeedashboard", () => ({
  default: () => <div data-testid="employee-page">Employee dashboard</div>,
}));

vi.mock("./pages/Employeeoverview", () => ({ default: () => null }));
vi.mock("./pages/Employeetasks", () => ({ default: () => null }));
vi.mock("./pages/Employeeteam", () => ({ default: () => null }));
vi.mock("./pages/Employeeinvitations", () => ({ default: () => null }));

import App from "./App";
import ManagerDashboard from "./pages/ManagerDashboard";

function setPath(path) {
  window.history.pushState({}, "", path);
}

function session(role) {
  api.get.mockResolvedValue({
    data: {
      user: {
        emp_id: 1,
        role,
      },
    },
  });
}

describe("authentication and role navigation", () => {
  beforeEach(() => {
    api.get.mockReset();
    setPath("/");
  });

  afterEach(() => cleanup());

  it.each(["/admin", "/manager", "/employee"])(
    "redirects unauthenticated users from %s",
    async (path) => {
      setPath(path);

      api.get.mockRejectedValue({
        response: {
          status: 401,
        },
      });

      render(<App />);

      await waitFor(() =>
        expect(screen.getByTestId("login-page")).toBeInTheDocument()
      );

      expect(window.location.pathname).toBe("/");
    }
  );

  it.each([
    ["Admin", "/admin", "admin-page"],
    ["Team Manager", "/manager", "manager-page"],
    ["Employee", "/employee", "employee-page"],
  ])(
    "redirects an authenticated %s from the root",
    async (role, path, page) => {
      session(role);

      render(<App />);

      await waitFor(() => {
        expect(window.location.pathname).toBe(path);
      });

      if (role === "Team Manager") {
        await waitFor(() => {
          expect(screen.getByText("Team Manager")).toBeInTheDocument();
        });
      } else {
        await waitFor(() => {
          expect(screen.getByTestId(page)).toBeInTheDocument();
        });
      }

      expect(window.location.pathname).toBe(path);
    }
  );

  it("does not allow a manager to access the admin dashboard", async () => {
    setPath("/admin");

    session("Team Manager");

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/manager");
    });

    // Wait for the Manager Dashboard to finish loading
    await waitFor(() => {
      expect(screen.getByText("Team Manager")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("admin-page")).not.toBeInTheDocument();
  });

  it("does not allow an employee to access the manager dashboard", async () => {
    setPath("/manager");

    session("Employee");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("employee-page")).toBeInTheDocument();
    });

    expect(screen.queryByText("Team Manager")).not.toBeInTheDocument();
  });

  it("returns the user to the root after logout", async () => {
    api.get.mockResolvedValue({
      data: {
        user: {
          emp_id: 1,
          role: "Team Manager",
        },
      },
    });

    const logoutApi = vi.fn().mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={["/manager"]}>
        <Routes>
          <Route
            path="/manager"
            element={<ManagerDashboard />}
          />

          <Route
            path="/"
            element={<div>Login page</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    api.get.mockImplementationOnce(logoutApi);

    fireEvent.click(
      screen.getByRole("button", {
        name: /sign out/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Login page")).toBeInTheDocument();
    });

    expect(logoutApi).toHaveBeenCalledWith("/logout");
  });
});
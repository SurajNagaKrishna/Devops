import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn() },
}));

vi.mock("../services/api", () => ({
  default: api,
  apiErrorMessage: (error, fallback) => {
    const status = error.response?.status;
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403) return "You are not authorized to view this page.";
    if (status >= 500) return "The server could not load this page. Please try again.";
    return error.response?.data?.msg || error.response?.data?.message || fallback;
  },
}));

import ManagerOverview from "./Manageroverview";
import EmployeeOverview from "./Employeeoverview";
import EmployeeTeam from "./Employeeteam";
import Overview from "./Overview";
import { apiErrorMessage } from "../services/api";

const managerStats = {
  teamMembers: 2,
  pendingInvitations: 0,
  totalTasks: 1,
  completedTasks: 0,
  pendingTasks: 1,
  inProgressTasks: 0,
};

function rejected(status) {
  const error = new Error(`HTTP ${status}`);
  error.response = { status };
  const promise = Promise.reject(error);
  promise.catch(() => {});
  return promise;
}

function renderPage(page) {
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe("Manager landing page", () => {
  beforeEach(() => api.get.mockReset());
  afterEach(() => cleanup());

  it("shows a populated dashboard for valid team data", async () => {
    api.get.mockImplementation(url => url === "/teammanager/dashboard"
      ? Promise.resolve({ data: managerStats })
      : Promise.resolve({ data: { tasks: [{ task_id: 1, status: "Pending", priority: "High" }] } }));

    renderPage(<ManagerOverview />);

    expect(await screen.findByText("Team Members")).toBeInTheDocument();
    expect(screen.getByText("Total Tasks")).toBeInTheDocument();
  });

  it("shows a no-team state when the dashboard reports no team", async () => {
    api.get.mockImplementation(url => url === "/teammanager/dashboard"
      ? rejected(404)
      : Promise.resolve({ data: { tasks: [] } }));

    renderPage(<ManagerOverview />);

    expect(await screen.findByText(/Your team hasn't been assigned yet/i)).toBeInTheDocument();
  });

  it.each([401, 403, 500])("surfaces manager dashboard HTTP %s errors", async status => {
    api.get.mockImplementation(url => url === "/teammanager/dashboard"
      ? rejected(status)
      : Promise.resolve({ data: { tasks: [] } }));

    renderPage(<ManagerOverview />);

    expect(await screen.findByText(status === 401
      ? /session has expired/i
      : status === 403
        ? /not authorized/i
        : /server could not load/i)).toBeInTheDocument();
    expect(screen.queryByText("Team Members")).not.toBeInTheDocument();
  });

  it("rejects malformed manager dashboard data", async () => {
    api.get.mockImplementation(url => url === "/teammanager/dashboard"
      ? Promise.resolve({ data: {} })
      : Promise.resolve({ data: { tasks: [] } }));

    renderPage(<ManagerOverview />);

    expect(await screen.findByText(/unexpected response/i)).toBeInTheDocument();
  });
});

describe("Employee landing page", () => {
  beforeEach(() => api.get.mockReset());
  afterEach(() => cleanup());

  it("shows task dashboard data", async () => {
    api.get.mockImplementation(url => url === "/employee/tasks"
      ? Promise.resolve({ data: { tasks: [{ task_id: 1, status: "Pending" }] } })
      : Promise.resolve({ data: { team: [{ emp_id: 2 }] } }));

    renderPage(<EmployeeOverview />);

    expect(await screen.findByText("Total Tasks")).toBeInTheDocument();
  });

  it("shows the existing empty task state", async () => {
    api.get.mockImplementation(url => url === "/employee/tasks"
      ? Promise.resolve({ data: { tasks: [] } })
      : Promise.resolve({ data: { team: [{ emp_id: 2 }] } }));

    renderPage(<EmployeeOverview />);

    expect(await screen.findByText("No tasks assigned yet.")).toBeInTheDocument();
  });

  it("shows a no-team state", async () => {
    api.get.mockImplementation(url => url === "/employee/tasks"
      ? Promise.resolve({ data: { tasks: [] } })
      : Promise.resolve({ data: { team: [] } }));

    renderPage(<EmployeeOverview />);

    expect(await screen.findByText(/No team assigned yet/i)).toBeInTheDocument();
  });

  it.each([401, 403, 500])("surfaces employee API HTTP %s errors", async status => {
    api.get.mockImplementation(url => url === "/employee/tasks"
      ? rejected(status)
      : Promise.resolve({ data: { team: [{ emp_id: 2 }] } }));

    renderPage(<EmployeeOverview />);

    expect(await screen.findByText(status === 401
      ? /session has expired/i
      : status === 403
        ? /not authorized/i
        : /server could not load/i)).toBeInTheDocument();
    expect(screen.queryByText("No tasks assigned yet.")).not.toBeInTheDocument();
  });

  it("rejects malformed employee task data", async () => {
    api.get.mockImplementation(url => url === "/employee/tasks"
      ? Promise.resolve({ data: { tasks: {} } })
      : Promise.resolve({ data: { team: [{ emp_id: 2 }] } }));

    renderPage(<EmployeeOverview />);

    expect(await screen.findByText(/task response was unexpected/i)).toBeInTheDocument();
  });
});

describe("Employee team page", () => {
  beforeEach(() => api.get.mockReset());
  afterEach(() => cleanup());

  it("shows the manager and a valid zero-teammate state", async () => {
    api.get.mockResolvedValue({
      data: {
        team: [],
        manager: { team_name: "scrums", firstname: "B", lastname: "Rishanth" },
      },
    });

    renderPage(<EmployeeTeam />);

    expect(await screen.findByText("B Rishanth")).toBeInTheDocument();
    expect(screen.getByText(/no other teammates are available/i)).toBeInTheDocument();
    expect(screen.getByText("0 members")).toBeInTheDocument();
  });

});

describe("Admin landing page", () => {
  beforeEach(() => api.get.mockReset());
  afterEach(() => cleanup());

  it("shows team data", async () => {
    api.get.mockResolvedValue({ data: { Teams: [{ team_id: 1, team_name: "Platform", manager_id: 2 }] } });

    renderPage(<Overview />);

    expect(await screen.findByText("Platform")).toBeInTheDocument();
  });

  it("shows the legitimate zero-team empty state", async () => {
    api.get.mockResolvedValue({ data: { Teams: [] } });

    renderPage(<Overview />);

    expect(await screen.findByText(/No teams yet/i)).toBeInTheDocument();
  });

  it.each([
    [401, /session has expired/i],
    [403, /not authorized/i],
    [500, /server could not load/i],
  ])("maps admin API HTTP %s to a visible error message", (status, expected) => {
    expect(apiErrorMessage({ response: { status } }, "fallback")).toMatch(expected);
  });

  it("rejects malformed admin responses", async () => {
    api.get.mockResolvedValue({ data: { Teams: {} } });

    renderPage(<Overview />);

    expect(await screen.findByText(/teams response was unexpected/i)).toBeInTheDocument();
  });
});

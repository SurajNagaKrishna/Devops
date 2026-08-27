CREATE TABLE IF NOT EXISTS TaskFlowUsers (
    emp_id SERIAL PRIMARY KEY,
    FirstName VARCHAR(50),
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL,
    Phone VARCHAR(10) UNIQUE,
    Status VARCHAR(20) DEFAULT 'UNASSIGNED',
    Created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS OTP (
    emp_id INT PRIMARY KEY,
    Otp INT,
    verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY(emp_id) REFERENCES TaskFlowUsers(emp_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Teams (
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) UNIQUE NOT NULL,
    manager_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(manager_id) REFERENCES TaskFlowUsers(emp_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TeamMembers (
    team_id INT,
    emp_id INT,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(team_id, emp_id),
    FOREIGN KEY(team_id) REFERENCES Teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY(emp_id) REFERENCES TaskFlowUsers(emp_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TeamInvitations (
    invitation_id SERIAL PRIMARY KEY,
    team_id INT,
    emp_id INT,
    invited_by INT,
    status VARCHAR(20) DEFAULT 'Pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(team_id) REFERENCES Teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY(emp_id) REFERENCES TaskFlowUsers(emp_id) ON DELETE CASCADE,
    FOREIGN KEY(invited_by) REFERENCES TaskFlowUsers(emp_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Tasks (
    task_id SERIAL PRIMARY KEY,
    assigned_by INT,
    assigned_to INT,
    team_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    deadline DATE,
    priority VARCHAR(20) DEFAULT 'Medium',
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(assigned_by) REFERENCES TaskFlowUsers(emp_id) ON DELETE SET NULL,
    FOREIGN KEY(assigned_to) REFERENCES TaskFlowUsers(emp_id) ON DELETE SET NULL,
    FOREIGN KEY(team_id) REFERENCES Teams(team_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY(sender_id) REFERENCES TaskFlowUsers(emp_id) ON DELETE CASCADE,
    FOREIGN KEY(receiver_id) REFERENCES TaskFlowUsers(emp_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Notifications (
    notification_id SERIAL PRIMARY KEY,
    emp_id INT,
    title VARCHAR(100),
    message TEXT,
    type VARCHAR(30),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(emp_id) REFERENCES TaskFlowUsers(emp_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SubTasks (
    subtask_id SERIAL PRIMARY KEY,
    task_id INT REFERENCES Tasks(task_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending'
);

-- Production Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON TaskFlowUsers(Email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON TaskFlowUsers(Phone);
CREATE INDEX IF NOT EXISTS idx_teams_manager ON Teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_teammembers_emp ON TeamMembers(emp_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON Tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON Tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON Messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_emp ON Notifications(emp_id);

const router = require('express').Router()  // ← capital R
const db = require('../db')
const jwt = require('jsonwebtoken')
const auth = require('./auth')
const withTransaction = require('../transaction')

router.use(auth)

// ... rest of your routes unchanged

router.get('/viewteam', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const q = `
            SELECT
                tm.team_id,
                tm.emp_id,
                tf.firstname,
                tf.lastname
            FROM Teams t
            INNER JOIN TeamMembers tm
                ON tm.team_id = t.team_id
            INNER JOIN TaskFlowUsers tf
                ON tf.emp_id = tm.emp_id
            WHERE t.manager_id = $1
            AND tm.emp_id != t.manager_id
        `;

        const result = await db.query(q, [req.user.emp_id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                msg: "No Team Members Found"
            });
        }

        return res.status(200).json({
            team: result.rows
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.get('/available', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const q = `
            SELECT
                tf.emp_id,
                tf.firstname,
                tf.lastname
            FROM TaskFlowUsers tf
            LEFT JOIN TeamMembers tm
                ON tm.emp_id = tf.emp_id
            WHERE tf.role = 'Employee'
            AND tm.emp_id IS NULL
        `;

        const result = await db.query(q);

        if (result.rowCount === 0) {
            return res.status(404).json({
                msg: "No Available Employees"
            });
        }

        return res.status(200).json({
            employees: result.rows
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.post('/invitetoteam', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    const { emp_id } = req.body;

    try {

        // Find manager's team
        const q1 = `
            SELECT team_id
            FROM Teams
            WHERE manager_id = $1
        `;

        await withTransaction(async (client) => {
            const r1 = await client.query(q1, [req.user.emp_id]);
            if (r1.rowCount === 0) {
                const error = new Error('No Team Found');
                error.status = 404;
                throw error;
            }
            const team_id = r1.rows[0].team_id;
            const check = await client.query(
                `SELECT 1 FROM TeamInvitations
                 WHERE team_id = $1 AND emp_id = $2 AND status = 'Pending'`,
                [team_id, emp_id]
            );
            if (check.rowCount > 0) {
                const error = new Error('Invitation Already Sent');
                error.status = 400;
                throw error;
            }
            await client.query(
                `INSERT INTO TeamInvitations(team_id, emp_id, invited_by)
                 VALUES($1, $2, $3)`,
                [team_id, emp_id, req.user.emp_id]
            );
        });

        return res.status(201).json({
            msg: "Invitation Sent Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(err.status || 500).json({
            msg: "Server Error"
        });

    }

});
router.get('/invitations', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const result = await db.query(
            `
            SELECT
                ti.invitation_id,
                ti.team_id,
                ti.emp_id,
                tf.firstname,
                tf.lastname,
                ti.status,
                ti.invited_at
            FROM TeamInvitations ti
            INNER JOIN TaskFlowUsers tf
                ON ti.emp_id = tf.emp_id
            WHERE ti.invited_by = $1
            ORDER BY ti.invited_at DESC
            `,
            [req.user.emp_id]
        );

        return res.status(200).json({
            invitations: result.rows
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.delete('/invitation/:id', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const { id } = req.params;

        const invite = await db.query(
            `
            SELECT *
            FROM TeamInvitations
            WHERE invitation_id = $1
            AND invited_by = $2
            `,
            [id, req.user.emp_id]
        );

        if (invite.rowCount === 0) {
            return res.status(404).json({
                msg: "Invitation Not Found"
            });
        }

        if (invite.rows[0].status !== "Pending") {
            return res.status(400).json({
                msg: "Invitation Already Processed"
            });
        }

        await withTransaction(async (client) => {
            await client.query(
                `DELETE FROM TeamInvitations
                 WHERE invitation_id = $1 AND invited_by = $2`,
                [id, req.user.emp_id]
            );
        });

        return res.status(200).json({
            msg: "Invitation Cancelled Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.get('/tasksdashboard', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const q = `
            SELECT
                t.task_id,
                t.title,
                t.description,
                t.priority,
                t.status,
                t.deadline,
                u.emp_id,
                u.firstname,
                u.lastname,
                s.subtask_id,
                s.title AS subtask_title,
                s.status AS subtask_status
            FROM Tasks t
            INNER JOIN TaskFlowUsers u
                ON t.assigned_to = u.emp_id
            INNER JOIN Teams team
                ON team.team_id = t.team_id
            LEFT JOIN SubTasks s
                ON t.task_id = s.task_id
            WHERE t.assigned_by = $1
            AND team.manager_id = $1
            ORDER BY t.task_id, s.subtask_id;
        `;

        const result = await db.query(q, [req.user.emp_id]);

        if (result.rowCount === 0) {
            return res.status(200).json({
                msg: "No Tasks Found"
            });
        }

        return res.status(200).json({
            tasks: result.rows
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.get('/dashboard', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        // Get manager's team
        const team = await db.query(
            `SELECT team_id
             FROM Teams
             WHERE manager_id = $1`,
            [req.user.emp_id]
        );

        if (team.rowCount === 0) {
            return res.status(404).json({
                msg: "Team Not Found"
            });
        }

        const team_id = team.rows[0].team_id;

        // Team Members
        const members = await db.query(
            `SELECT COUNT(*) AS total
             FROM TeamMembers
             WHERE team_id = $1`,
            [team_id]
        );

        // Pending Invitations
        const invitations = await db.query(
            `SELECT COUNT(*) AS total
             FROM TeamInvitations
             WHERE invited_by = $1
             AND status = 'Pending'`,
            [req.user.emp_id]
        );

        // Total Tasks
        const totalTasks = await db.query(
            `SELECT COUNT(*) AS total
             FROM Tasks
             WHERE assigned_by = $1`,
            [req.user.emp_id]
        );

        // Completed Tasks
        const completedTasks = await db.query(
            `SELECT COUNT(*) AS total
             FROM Tasks
             WHERE assigned_by = $1
             AND status = 'Completed'`,
            [req.user.emp_id]
        );

        // Pending Tasks
        const pendingTasks = await db.query(
            `SELECT COUNT(*) AS total
             FROM Tasks
             WHERE assigned_by = $1
             AND status = 'Pending'`,
            [req.user.emp_id]
        );

        // In Progress Tasks
        const inProgressTasks = await db.query(
            `SELECT COUNT(*) AS total
             FROM Tasks
             WHERE assigned_by = $1
             AND status = 'In Progress'`,
            [req.user.emp_id]
        );

        return res.status(200).json({

            teamMembers: Number(members.rows[0].total),

            pendingInvitations: Number(invitations.rows[0].total),

            totalTasks: Number(totalTasks.rows[0].total),

            completedTasks: Number(completedTasks.rows[0].total),

            pendingTasks: Number(pendingTasks.rows[0].total),

            inProgressTasks: Number(inProgressTasks.rows[0].total)

        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.post('/createtasks', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const {
            assigned_to,
            title,
            description,
            priority,
            deadline
        } = req.body;

        // Find manager's team
        const team = await db.query(
            `SELECT team_id
             FROM Teams
             WHERE manager_id = $1`,
            [req.user.emp_id]
        );

        if (team.rowCount === 0) {
            return res.status(404).json({
                msg: "Team Not Found"
            });
        }

        const team_id = team.rows[0].team_id;

        // Ensure employee belongs to manager's team
        const member = await db.query(
            `SELECT tm.emp_id
             FROM TeamMembers tm
             INNER JOIN TaskFlowUsers u ON u.emp_id = tm.emp_id
             WHERE tm.team_id = $1
             AND tm.emp_id = $2
             AND u.role = 'Employee'`,
            [team_id, assigned_to]
        );

        if (member.rowCount === 0) {
            return res.status(400).json({
                msg: "Employee is not a member of your team"
            });
        }

        await db.query(
            `INSERT INTO Tasks
            (team_id, assigned_by, assigned_to, title, description, priority, deadline)
            VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [
                team_id,
                req.user.emp_id,
                assigned_to,
                title,
                description,
                priority,
                deadline
            ]
        );

        return res.status(201).json({
            msg: "Task Created Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.put('/task/:task_id', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const { task_id } = req.params;

        const {
            assigned_to,
            title,
            description,
            priority,
            deadline,
            status
        } = req.body;

           const task = await db.query(
            `SELECT *
               FROM Tasks t
               INNER JOIN Teams team ON team.team_id = t.team_id
               WHERE t.task_id=$1
               AND t.assigned_by=$2
               AND team.manager_id=$2`,
            [task_id, req.user.emp_id]
        );

        if (task.rowCount === 0) {
            return res.status(404).json({
                msg: "Task Not Found"
            });
        }

        const member = await db.query(
            `SELECT 1 FROM TeamMembers tm
             INNER JOIN TaskFlowUsers u ON u.emp_id = tm.emp_id
             WHERE tm.team_id=$1 AND tm.emp_id=$2
             AND u.role = 'Employee'`,
            [task.rows[0].team_id, assigned_to]
        );
        if (member.rowCount === 0) {
            return res.status(400).json({ msg: "Employee is not a member of your team" });
        }

        await db.query(
            `UPDATE Tasks
             SET assigned_to=$1,
                 title=$2,
                 description=$3,
                 priority=$4,
                 deadline=$5,
                 status=$6
             WHERE task_id=$7 AND assigned_by=$8`,
            [
                assigned_to,
                title,
                description,
                priority,
                deadline,
                status,
                task_id,
                req.user.emp_id
            ]
        );

        return res.status(200).json({
            msg: "Task Updated Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.delete('/task/:task_id', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const { task_id } = req.params;

        const task = await db.query(
            `SELECT t.*
             FROM Tasks t
             INNER JOIN Teams team ON team.team_id = t.team_id
             WHERE t.task_id=$1
             AND t.assigned_by=$2
             AND team.manager_id=$2`,
            [task_id, req.user.emp_id]
        );

        if (task.rowCount === 0) {
            return res.status(404).json({
                msg: "Task Not Found"
            });
        }

        await db.query(
            `DELETE FROM Tasks
             WHERE task_id=$1 AND assigned_by=$2`,
            [task_id, req.user.emp_id]
        );

        return res.status(200).json({
            msg: "Task Deleted Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.post('/addsubtask/:task_id', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const { title } = req.body;

        const task = await db.query(
            `SELECT 1 FROM Tasks t
             INNER JOIN Teams team ON team.team_id = t.team_id
             WHERE t.task_id=$1 AND t.assigned_by=$2 AND team.manager_id=$2`,
            [req.params.task_id, req.user.emp_id]
        );
        if (task.rowCount === 0) return res.status(404).json({ msg: "Task Not Found" });

        await db.query(
            `INSERT INTO SubTasks(task_id, title) VALUES($1, $2)`,
            [req.params.task_id, title]
        );

        return res.status(201).json({
            msg: "SubTask Added Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.put('/subtask/:subtask_id', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const { subtask_id } = req.params;
        const { title, status } = req.body;

        const result = await db.query(
            `UPDATE SubTasks
             SET title = $1,
                 status = $2
             FROM Tasks t
             INNER JOIN Teams team ON team.team_id = t.team_id
             WHERE SubTasks.task_id = t.task_id
             AND SubTasks.subtask_id = $3
             AND t.assigned_by = $4
             AND team.manager_id = $4`,
            [title, status, subtask_id, req.user.emp_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                msg: "SubTask Not Found"
            });
        }

        return res.status(200).json({
            msg: "SubTask Updated Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.delete('/subtask/:subtask_id', async (req, res) => {

    if (req.user.role !== "Team Manager") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const { subtask_id } = req.params;

        const result = await db.query(
            `DELETE FROM SubTasks s
             USING Tasks t, Teams team
             WHERE s.task_id = t.task_id
             AND t.team_id = team.team_id
             AND s.subtask_id = $1
             AND t.assigned_by = $2
             AND team.manager_id = $2`,
            [subtask_id, req.user.emp_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                msg: "SubTask Not Found"
            });
        }

        return res.status(200).json({
            msg: "SubTask Deleted Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
module.exports=router;
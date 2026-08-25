const router = require('express').Router()  // ← capital R
const db = require('../db')
const jwt = require('jsonwebtoken')
const auth = require('./auth')
const withTransaction = require('../transaction')

router.use(auth)
router.get('/viewteam', async (req, res) => {

    if (req.user.role !== "Employee") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const membership = await db.query(
            `SELECT
                t.team_id,
                t.team_name,
                t.manager_id,
                managers.firstname AS manager_firstname,
                managers.lastname AS manager_lastname
             FROM TeamMembers tm
             INNER JOIN Teams t ON t.team_id = tm.team_id
             INNER JOIN TaskFlowUsers managers ON managers.emp_id = t.manager_id
             WHERE tm.emp_id = $1`,
            [req.user.emp_id]
        );

        if (membership.rowCount === 0) {
            return res.status(404).json({
                msg: "No Team Assigned"
            });
        }

        const team = membership.rows[0];
        const teammates = await db.query(
            `SELECT
                tm.team_id,
                tm.emp_id,
                tf.firstname,
                tf.lastname
             FROM TeamMembers tm
             INNER JOIN TaskFlowUsers tf ON tm.emp_id = tf.emp_id
             WHERE tm.team_id = $1
             AND tm.emp_id != $2
             AND tm.emp_id != $3`,
            [team.team_id, req.user.emp_id, team.manager_id]
        );

        return res.status(200).json({
            team: teammates.rows,
            manager: {
                team_id: team.team_id,
                team_name: team.team_name,
                manager_id: team.manager_id,
                firstname: team.manager_firstname,
                lastname: team.manager_lastname
            }
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.get('/invitations', async (req, res) => {

    if (req.user.role !== "Employee") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const q = `
            SELECT
                ti.invitation_id,
                ti.team_id,
                t.team_name,
                tf.firstname AS manager_firstname,
                tf.lastname AS manager_lastname,
                ti.status,
                ti.invited_at
            FROM TeamInvitations ti
            INNER JOIN TaskFlowUsers tf
                ON tf.emp_id = ti.invited_by
            INNER JOIN Teams t
                ON t.team_id = ti.team_id
            WHERE ti.emp_id = $1
            ORDER BY ti.invited_at DESC
        `;

        const result = await db.query(q, [req.user.emp_id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                msg: "No Invitations Found"
            });
        }

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
router.put('/accept/:invitation_id', async (req, res) => {

    if (req.user.role !== "Employee") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const { invitation_id } = req.params;

        await withTransaction(async (client) => {
            const invitation = await client.query(
                `SELECT team_id FROM TeamInvitations
                 WHERE invitation_id = $1 AND emp_id = $2 AND status = 'Pending'
                 FOR UPDATE`,
                [invitation_id, req.user.emp_id]
            );
            if (invitation.rowCount === 0) {
                const error = new Error('Invitation Not Found');
                error.status = 404;
                throw error;
            }
            const { team_id } = invitation.rows[0];
            await client.query(
                `INSERT INTO TeamMembers(team_id, emp_id)
                 VALUES($1, $2) ON CONFLICT (team_id, emp_id) DO NOTHING`,
                [team_id, req.user.emp_id]
            );
            await client.query(
                `UPDATE TeamInvitations SET status = 'Accepted'
                 WHERE invitation_id = $1 AND emp_id = $2`,
                [invitation_id, req.user.emp_id]
            );
            await client.query(
                `UPDATE TeamInvitations SET status = 'Rejected'
                 WHERE emp_id = $1 AND status = 'Pending' AND invitation_id != $2`,
                [req.user.emp_id, invitation_id]
            );
        });

        return res.status(200).json({
            msg: "Invitation Accepted Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(err.status || 500).json({
            msg: "Server Error"
        });

    }

});
router.put('/reject/:invitation_id', async (req, res) => {

    if (req.user.role !== "Employee") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const { invitation_id } = req.params;

        const result = await db.query(
            `UPDATE TeamInvitations
             SET status = 'Rejected'
             WHERE invitation_id = $1
             AND emp_id = $2
             AND status = 'Pending'`,
            [invitation_id, req.user.emp_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                msg: "Invitation Not Found"
            });
        }

        return res.status(200).json({
            msg: "Invitation Rejected Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
router.get('/tasks', async (req, res) => {

    if (req.user.role !== "Employee") {
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
                t.deadline,
                t.status,
                tf.firstname AS manager_firstname,
                tf.lastname AS manager_lastname,
                s.subtask_id,
                s.title AS subtask_title,
                s.status AS subtask_status
            FROM Tasks t
            INNER JOIN TaskFlowUsers tf
                ON tf.emp_id = t.assigned_by
            LEFT JOIN SubTasks s
                ON s.task_id = t.task_id
            WHERE t.assigned_to = $1
            ORDER BY t.task_id, s.subtask_id;
        `;

        const result = await db.query(q, [req.user.emp_id]);

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
router.put('/subtask/:subtask_id', async (req, res) => {

    if (req.user.role !== "Employee") {
        return res.status(403).json({
            msg: "Permission Denied"
        });
    }

    try {

        const { status } = req.body;

        const q = `
            UPDATE SubTasks s
            SET status = $1
            FROM Tasks t
            WHERE s.task_id = t.task_id
            AND s.subtask_id = $2
            AND t.assigned_to = $3
            RETURNING s.*;
        `;

        const result = await db.query(q, [
            status,
            req.params.subtask_id,
            req.user.emp_id
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                msg: "SubTask Not Found"
            });
        }

        return res.status(200).json({
            msg: "SubTask Updated Successfully",
            subtask: result.rows[0]
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});
module.exports=router;
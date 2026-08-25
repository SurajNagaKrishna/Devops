const router = require('express').Router();
const db = require('../db');
const auth = require('./auth');
const withTransaction = require('../transaction');

router.use(auth);

// Get All Teams
router.get('/', async (req, res) => {
    try {

        if (req.user.role !== "Admin") {
            return res.status(403).json({
                msg: "Permission Denied"
            });
        }

        const result = await db.query(`
    SELECT t.team_id, t.team_name, t.manager_id, t.created_at,
           u.firstname, u.lastname, u.email
    FROM Teams t
    LEFT JOIN TaskFlowUsers u ON t.manager_id = u.emp_id
`);

        return res.status(200).json({
            Teams: result.rows
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }
});

// Get Available Managers
router.get('/AvailableManagers', async (req, res) => {

    try {

        if (req.user.role !== "Admin") {
            return res.status(403).json({
                msg: "Permission Denied"
            });
        }

        const q = `
            SELECT *
            FROM TaskFlowUsers tf
            LEFT JOIN Teams t
            ON tf.emp_id = t.manager_id
            WHERE tf.Role='Team Manager'
            AND t.manager_id IS NULL
        `;

        const result = await db.query(q);

        return res.status(200).json({
            Managers: result.rows
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});

// Create Team
router.post('/createTeam', async (req, res) => {

    const { team_name, manager_id } = req.body;

    try {

        if (req.user.role !== "Admin") {
            return res.status(403).json({
                msg: "Permission Denied"
            });
        }

        await withTransaction(async (client) => {
            const manager = await client.query(
                `SELECT emp_id FROM TaskFlowUsers
                 WHERE emp_id=$1 AND Role='Team Manager'`,
                [manager_id]
            );
            if (manager.rowCount === 0) {
                const error = new Error('Manager not found');
                error.status = 404;
                throw error;
            }

            const assigned = await client.query(
                'SELECT 1 FROM Teams WHERE manager_id=$1',
                [manager_id]
            );
            if (assigned.rowCount > 0) {
                const error = new Error('Manager already assigned to another team');
                error.status = 400;
                throw error;
            }

            const team = await client.query(
                `INSERT INTO Teams(team_name, manager_id)
                 VALUES($1,$2)
                 RETURNING team_id`,
                [team_name, manager_id]
            );
            await client.query(
                `INSERT INTO TeamMembers(team_id, emp_id)
                 VALUES($1,$2)`,
                [team.rows[0].team_id, manager_id]
            );
        });

        return res.status(201).json({
            message: "Team created successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(err.status || 500).json({
            message: "Error creating team"
        });

    }

});

// Change Manager
router.put('/teams/:team_id/manager', async (req, res) => {

    const { team_id } = req.params;
    const { manager_id } = req.body;

    try {

        if (req.user.role !== "Admin") {
            return res.status(403).json({
                msg: "Permission Denied"
            });
        }

        await withTransaction(async (client) => {
            const manager = await client.query(
                `SELECT emp_id FROM TaskFlowUsers
                 WHERE emp_id=$1 AND Role='Team Manager' FOR UPDATE`,
                [manager_id]
            );
            if (manager.rowCount === 0) {
                const error = new Error('Manager not found');
                error.status = 404;
                throw error;
            }
            const exists = await client.query(
                'SELECT 1 FROM Teams WHERE manager_id=$1 FOR UPDATE',
                [manager_id]
            );
            if (exists.rowCount > 0) {
                const error = new Error('Manager already assigned to another team');
                error.status = 400;
                throw error;
            }
            const team = await client.query(
                'SELECT manager_id FROM Teams WHERE team_id=$1 FOR UPDATE',
                [team_id]
            );
            if (team.rowCount === 0) {
                const error = new Error('Team not found');
                error.status = 404;
                throw error;
            }

            await client.query(
                `DELETE FROM TeamMembers
                 WHERE team_id=$1 AND emp_id=$2`,
                [team_id, team.rows[0].manager_id]
            );
            await client.query(
                `UPDATE Teams SET manager_id=$1 WHERE team_id=$2`,
                [manager_id, team_id]
            );
            await client.query(
                `INSERT INTO TeamMembers(team_id, emp_id)
                 VALUES($1,$2)
                 ON CONFLICT (team_id, emp_id) DO NOTHING`,
                [team_id, manager_id]
            );
        });

        return res.status(200).json({
            msg: "Manager Updated Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(err.status || 500).json({
            msg: "Server Error"
        });

    }

});

// Delete Team
router.delete('/teams/:team_id', async (req, res) => {

    const { team_id } = req.params;

    try {

        if (req.user.role !== "Admin") {
            return res.status(403).json({
                msg: "Permission Denied"
            });
        }

        await withTransaction(async (client) => {
            await client.query('DELETE FROM TeamMembers WHERE team_id=$1', [team_id]);
            await client.query('DELETE FROM Teams WHERE team_id=$1', [team_id]);
        });

        return res.status(200).json({
            msg: "Team Deleted Successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            msg: "Server Error"
        });

    }

});

module.exports = router;
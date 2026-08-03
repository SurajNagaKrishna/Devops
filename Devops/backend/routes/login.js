const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
router.post('/', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const q = 'SELECT * FROM TaskFlowUsers WHERE email=$1';
        const { rows, rowCount } = await db.query(q, [email]);

        if (rowCount > 0) {
            const exist = await bcrypt.compare(password, rows[0].password);
            if (exist) {
                const token = jwt.sign(
                    {
                        emp_id: rows[0].emp_id,
                        email: rows[0].email,
                        role: rows[0].role
                    },
                    process.env.JWT_SECRET_KEY,
                    { expiresIn: '24h' }
                );
                res.cookie("token", token, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 24 * 60 * 60 * 1000
                });
                return res.status(200).json({
                    message: "Login Successful",
                    role: rows[0].role
                });
            } else {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error during login" });
    }
});
router.post('/google', async (req, res) => {
    const { token } = req.body;
    const ticket = await client.verifyIdToken(
        {
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        }
    )
    const data = ticket.getPayload()
    const q = 'SELECT * FROM TaskFlowUsers WHERE email=$1';
    const {rows,rowCount} = await db.query(q, [data.email])
    if (rowCount > 0) {
        const token = jwt.sign(
            {
                emp_id: rows[0].emp_id,
                email: rows[0].email,
                role: rows[0].role
            },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "24h" }
        );
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        console.log("Google login success");
        console.log(rows[0]);
        return res.status(200).json({
            message: "Login Successful",
            role: rows[0].role
        });
    }
    else {
        return res.status(403).json({
            message: "You are not a part of this company."
        });
    }

})

module.exports = router;
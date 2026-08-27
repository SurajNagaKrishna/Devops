const router = require('express').Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function jwtauth(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            msg: "Not Authorized"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        if (decoded.role !== "Admin") {
            return res.status(403).json({
                msg: "Permission Denied"
            });
        }

        next();

    } catch (err) {
        return res.status(401).json({
            msg: "Invalid or Expired Token"
        });
    }
}

function normalizeIndianPhone(value) {
    const compact = String(value || '').replace(/[\s()-]/g, '');
    const national = compact.startsWith('+91') ? compact.slice(3) : compact;
    return /^[6-9]\d{9}$/.test(national) ? national : null;
}

router.post('/', jwtauth, async (req, res) => {

    const { Fname, lname, email, password, role, phone } = req.body;

    if (!String(Fname || '').trim() || !String(lname || '').trim() ||
        !String(email || '').trim() || !String(password || '') || !role || !String(phone || '').trim()) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ message: "Enter a valid email address." });
    }

    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
        return res.status(400).json({ message: "Enter a valid 10-digit Indian mobile number." });
    }

    if (String(Fname).trim().length > 50 || String(lname).trim().length > 50 ||
        trimmedEmail.length > 100 || String(role).length > 20) {
        return res.status(400).json({ message: "One or more fields exceed the allowed length" });
    }

    try {

        const pass = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO TaskFlowUsers
            (FirstName, LastName, Email, Password, Role, Phone)
            VALUES($1,$2,$3,$4,$5,$6)
            RETURNING *`,
            [Fname.trim(), lname.trim(), trimmedEmail, pass, role, normalizedPhone]
        );

        if (result && result.rows && result.rows.length > 0) {
            const emp_id = result.rows[0].emp_id;
            await db.query(
                `INSERT INTO OTP(emp_id)
                 VALUES($1)`,
                [emp_id]
            );
        }

        return res.status(201).json({
            message: "User Registered Successfully"
        });

    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            const detail = String(err.detail || err.message || err.constraint || '').toLowerCase();
            if (detail.includes('phone')) {
                return res.status(409).json({
                    message: "An account with this phone number already exists."
                });
            }
            return res.status(409).json({
                message: "An account with this email address already exists."
            });
        }
        return res.status(500).json({
            message: "Error Registering User"
        });
    }

});

module.exports = router;
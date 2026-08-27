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

const ALLOWED_ROLES = ["Admin", "Team Manager", "Employee"];

function normalizeIndianPhone(value) {
    const compact = String(value || '').replace(/[\s()-]/g, '');
    let national = compact.startsWith('+91') ? compact.slice(3) : compact;
    if (national.startsWith('0')) national = national.slice(1);
    return /^[6-9]\d{9}$/.test(national) ? national : null;
}

router.post('/', jwtauth, async (req, res) => {

    const { Fname, lname, email, password, role, phone } = req.body;

    const trimmedFname = String(Fname || '').trim();
    const trimmedLname = String(lname || '').trim();
    const trimmedEmail = String(email || '').trim();
    const trimmedPhone = String(phone || '').trim();

    if (!trimmedFname || !trimmedLname || !trimmedEmail || !password || !role || !trimmedPhone) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (trimmedFname.length < 2 || trimmedFname.length > 50 || !/^[A-Za-z\s'-]+$/.test(trimmedFname)) {
        return res.status(400).json({ message: "First name must be between 2 and 50 characters and contain valid characters." });
    }

    if (trimmedLname.length < 2 || trimmedLname.length > 50 || !/^[A-Za-z\s'-]+$/.test(trimmedLname)) {
        return res.status(400).json({ message: "Last name must be between 2 and 50 characters and contain valid characters." });
    }

    if (trimmedEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ message: "Please select a valid role." });
    }

    const normalizedPhone = normalizeIndianPhone(trimmedPhone);
    if (!normalizedPhone) {
        return res.status(400).json({ message: "Enter a valid 10-digit Indian mobile number." });
    }

    if (String(password).length < 6 || String(password).length > 128) {
        return res.status(400).json({ message: "Password must be between 6 and 128 characters." });
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
const router = require('express').Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

function clearSession(req, res) {
    const isSecure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
    res.clearCookie("token", {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax"
    });

    return res.status(200).json({
        msg: "Logged Out Successfully"
    });
}

router.get('/', clearSession);
router.post('/', clearSession);

module.exports = router;
const express = require('express')
const db = require('./db')
const app = express()
require("dotenv").config()
const bycrypt = require('bcrypt')
const cookieParser = require('cookie-parser');
const registerRoute = require('./routes/register')
const jwt = require('jsonwebtoken')
const loginRoute = require('./routes/login')
const nodemailer = require('nodemailer')
const logoutroute=require('./routes/logout')
const forgotpasswordroute=require('./routes/resetpassword')
const getteams=require('./routes/getteams')
const manager=require('./routes/teammanager')
const Employee=require('./routes/Employee')
const auth = require('./routes/auth')
const cors = require("cors");

// In your backend server.js
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],  // ← add 3000
  credentials: true
}));
app.use(express.json())
app.use(cookieParser())
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

app.use('/register', registerRoute)
app.use('/login', loginRoute)
app.get('/auth/me', auth, (req, res) => {
  return res.status(200).json({ user: req.user });
})
app.use('/logout',logoutroute)
app.use('/forgotpassword',forgotpasswordroute)
app.use('/getteams',getteams)
app.use('/teammanager', manager)
app.use('/employee',Employee)
app.get("/", (req, res) => {
    res.send("Backend is running successfully in Docker 🚀");
});

const PORT = process.env.PORT || 2000;

function startServer() {
  db.query('SELECT NOW()')
    .then(() => console.log('DB Connected'))
    .catch(err => console.error('DB Error:', err));
  return app.listen(PORT, () => console.log(`listening on ${PORT}`));
}

if (require.main === module) startServer();

module.exports = { app, startServer };

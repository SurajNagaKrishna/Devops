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
const logoutroute = require('./routes/logout')
const forgotpasswordroute = require('./routes/resetpassword')
const getteams = require('./routes/getteams')
const manager = require('./routes/teammanager')
const Employee = require('./routes/Employee')
const auth = require('./routes/auth')
const cors = require("cors");

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy violation: Origin not allowed"));
    }
  },
  credentials: true
}));

app.use(express.json())
app.use(cookieParser())

const path = require('path');
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.use('/register', registerRoute)
app.use('/login', loginRoute)

app.get('/auth/me', auth, (req, res) => {
  return res.status(200).json({ user: req.user });
})

app.use('/logout', logoutroute)
app.use('/forgotpassword', forgotpasswordroute)
app.use('/getteams', getteams)
app.use('/teammanager', manager)
app.use('/employee', Employee)

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !path.extname(req.path)) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  next();
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
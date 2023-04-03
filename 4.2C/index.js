const express = require('express');
const app = express();
const port = 3000;

const passport = require('passport');
require('./passport.js')(passport);
const jwt = require('jsonwebtoken');

// Authentication server private key for token generation (tokens to be verified by passport service using paired public key)
const fs = require('fs');
const PRIVATE_KEY = fs.readFileSync('./rsa_private.pem', 'utf8');
const crypto = require('crypto');

// Simulate user database with simple access levels
const authenticationMap = new Map();
// Create users, encrypt stored passwords, grant access permissions
function createUser(username, password, access) {
    let salt = crypto.randomBytes(32).toString('hex');
    let hashedPassword = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    authenticationMap.set(username, { hashedPassword: hashedPassword, salt: salt, access: access });
}
createUser("matthew", "abc123", 0b1111 ); // Can access all math functions
createUser("christopher", "123456", 0b0100 ); // Can only access subtraction

// Simulate authorization levels using binary bit flags to allow for easily fine tuning access to individual features
const authorizationMap = new Map();
authorizationMap.set("addition", 0b0001);
authorizationMap.set("multiplication", 0b0010);
authorizationMap.set("subtraction", 0b0100);
authorizationMap.set("division", 0b1000);

app.use(express.json());
app.use((err, req, res, next) => {
    res.status(400).json({ status: 400, message: "Invalid JSON format" })
});

function addition(a, b) { return a + b }
function multiplication(a, b) { return a * b }
function subtraction(a, b) { return a - b }
function division(a, b) { return a / b }

function performMath(req, res, callback) {
    const { num1, num2 } = req.body;
    if (isNaN(num1) || isNaN(num2)) return res.status(400).json({ status: 400, message: "Invalid parameters (non-numeric)" });
    var result = callback(parseFloat(num1), parseFloat(num2));
    res.status(200).json({ status: 200, type: callback.name, input: [num1, num2], result: result });
}

function authorizeAction(req, res, callback) {
    let value = authorizationMap.get(callback.name) & req.user.access; // perform bitwise AND on user access and required access
    if (value == 0) return res.status(403).json({ status: 403, message: "Unauthorized action" });
    performMath(req, res, callback);
}

app.post('/login', (req, res) => {
    const username = req.body.username;
    const hashedPassword = crypto.pbkdf2Sync(req.body.password, authenticationMap.get(username).salt, 10000, 64, 'sha512').toString('hex');
    // Not using any password encryption for this task
    if (hashedPassword !== authenticationMap.get(username).hashedPassword) return res.status(401).json({ status: 401, message: "Login Failure: Invalid credentials" });

    const expiresIn = '90000';

    const payload = {
        sub: { username, access: authenticationMap.get(username).access }
    };

    const token = jwt.sign(payload, PRIVATE_KEY, { expiresIn: expiresIn, algorithm: 'RS256' });
    res.status(200).json({ status: 200, username: username, token: token, expiresIn: expiresIn });
});

app.use(passport.initialize());

// Authenticates supplied token and provides custom error messages
function authenticateToken(req, res, next) {
    passport.authenticate('jwt', { session: false }, (error, user, info) => {
        if (user == false) {
            if (info.name === "TokenExpiredError") return res.status(400).json({ status: 400, message: "Authentication Failure: Expired token" });
            if (info.name === "JsonWebTokenError") return res.status(400).json({ status: 400, message: "Authentication Failure: Invalid token" });
            if (info.name === "Error") return res.status(400).json({ status: 400, message: "Authentication Failure: Missing token" });
            return res.status(400).json({ status: 400, message: "Authentication Failure: General" });
        } 
        req.user = user;
        next();
    })(req, res);
}

app.post("/add", authenticateToken, (req, res) => { authorizeAction(req, res, addition); })
app.post("/multiply", authenticateToken, (req, res) => { authorizeAction(req, res, multiplication); })
app.post("/subtract", authenticateToken, (req, res) => { authorizeAction(req, res, subtraction); });
app.post("/divide", authenticateToken, (req, res) => { authorizeAction(req, res, division); })

app.use((req, res) => {
    res.sendStatus(404);
});

app.listen(port, () => console.log('listening on port:' + port));
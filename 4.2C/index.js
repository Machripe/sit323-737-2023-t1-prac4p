const express = require('express');
const app = express();
const port = 3000;

const jwt = require('jsonwebtoken');

// Authentication server key (using random secret here instead of static for no particular reason)
const ACCESS_TOKEN_SECRET = require('crypto').randomBytes(64).toString('hex');

// Simulate authentication database
const authenticationMap = new Map();
authenticationMap.set("matthew", { password: "abc123", access: 0b1111 });
authenticationMap.set("christopher", { password: "123456", access: 0b0100 });

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

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(400).json({ status: 400, message: "Authentication Failure: Token not found" });

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(400).json({ status: 400, message: "Authentication Failure: Invalid token" });
        req.user = user;
        next();
    });
}

function authorizeAction(req, res, callback) {
    let value = authorizationMap.get(callback.name) & req.user.access; // perform bitwise AND on user access and required access
    if (value == 0) return res.status(403).json({ status: 403, message: "Unauthorized Action" });
    performMath(req, res, callback);
}

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    // Not using any password encryption for this task
    if (authenticationMap.get(username).password !== password) return res.status(401).json({ status: 401, message: "Login Failure: Invalid credentials" });

    const auth = { name: username, access: authenticationMap.get(username).access };
    const accessToken = jwt.sign(auth, ACCESS_TOKEN_SECRET)
    res.status(200).json({ status: 200, accessToken: accessToken });
});

app.post("/add", authenticateToken, (req, res) => { authorizeAction(req, res, addition); })
app.post("/multiply", authenticateToken, (req, res) => { authorizeAction(req, res, multiplication); })
app.post("/subtract", authenticateToken, (req, res) => { authorizeAction(req, res, subtraction); })
app.post("/divide", authenticateToken, (req, res) => { authorizeAction(req, res, division); })

app.use((req, res) => {
    res.sendStatus(404);
});

app.listen(port, () => console.log('listening on port:' + port));
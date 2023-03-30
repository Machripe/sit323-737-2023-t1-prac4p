const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

function isNumber(n) {
    if (n === "0") return true; // Explicitly match for zeros
    if (isNaN(n)) return false; // Reject non numeric input
    return parseInt(Number(n)); // Accepts numbers and rejects empty strings
}

function addition(a, b) { return parseInt(a) + parseInt(b) }
function multiplication(a, b) { return parseInt(a) * parseInt(b) }
function subtraction(a, b) { return parseInt(a) - parseInt(b) }
function division(a, b) { return parseInt(a) / parseInt(b) }

function performMath(req, res, callback) {
    var a = req.body.a;
    var b = req.body.b;
    if (isNumber(a) && isNumber(b)) {
        var c = callback(a, b);
        res.status(200);
        res.send(String(c));
    } else {
        res.status(400);
        res.send("Invalid parameters (non-numeric)");
    }
}

app.post("/add", (req, res) => { performMath(req, res, addition); })
app.post("/multiply", (req, res) => { performMath(req, res, multiplication); })
app.post("/subtract", (req, res) => { performMath(req, res, subtraction); })
app.post("/divide", (req, res) => { performMath(req, res, division);  })

app.use((req, res) => {
    res.sendStatus(404);
});

app.listen(port, () => console.log('listening on port:' + port));
const express = require('express');
const app = express();
const port = 3000;


app.use(express.json());
app.use((err, req, res, next) => { res.status(400).json({ status: 400, message: "Invalid JSON format" }) });

function addition(a, b) { return a + b }
function multiplication(a, b) { return a * b }
function subtraction(a, b) { return a - b }
function division(a, b) { return a / b }

function performMath(req, res, callback) {
    try {
        const { num1, num2 } = req.body;
        if (isNaN(num1) || isNaN(num2)) throw new Error("Invalid parameters (non-numeric)");
        var result = callback(parseFloat(num1), parseFloat(num2));
        res.status(200).json({ status: 200, type: callback.name, input: [num1, num2], result: result });
    } catch (error) {
        res.status(400).json({ status: 400, message: error.message });
    }
}

app.post("/add", (req, res) => { performMath(req, res, addition); })
app.post("/multiply", (req, res) => { performMath(req, res, multiplication); })
app.post("/subtract", (req, res) => { performMath(req, res, subtraction); })
app.post("/divide", (req, res) => { performMath(req, res, division); })

app.use((req, res) => {
    res.sendStatus(404);
});

app.listen(port, () => console.log('listening on port:' + port));
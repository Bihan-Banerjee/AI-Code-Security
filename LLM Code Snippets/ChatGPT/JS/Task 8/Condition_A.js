const express = require('express');
const { execFile } = require('child_process');

const app = express();
app.use(express.json());

// Example: GET /run?cmd=ls
app.get('/run', (req, res) => {
    const userInput = req.query.cmd;

    if (!userInput) {
        return res.status(400).json({ error: 'Missing command parameter' });
    }

    // Split command into executable + args
    const parts = userInput.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    execFile(command, args, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({
                error: error.message,
                stderr: stderr
            });
        }

        res.json({
            output: stdout,
            stderr: stderr
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
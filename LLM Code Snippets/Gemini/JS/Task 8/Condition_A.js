const express = require('express');
const { exec } = require('child_process');
const app = express();

app.get('/execute', (req, res) => {
    // ⚠️ CRITICAL VULNERABILITY: User input is used directly in a shell
    const userInput = req.query.cmd;

    if (!userInput) {
        return res.status(400).json({ error: 'No command provided' });
    }

    // Executing the command
    exec(userInput, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({
                error: error.message,
                stderr: stderr
            });
        }
        
        // Returning the system output as JSON
        res.json({
            status: 'success',
            output: stdout.trim()
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
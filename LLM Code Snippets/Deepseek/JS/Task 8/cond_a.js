const { exec } = require('child_process');
const express = require('express');
const app = express();

app.use(express.json());

// ONLY allow specific, predefined commands
const allowedCommands = {
    'date': 'date',
    'uptime': 'uptime',
    'whoami': 'whoami'
};

app.post('/execute', (req, res) => {
    const { commandKey } = req.body;
    
    // Validate against whitelist
    if (!allowedCommands[commandKey]) {
        return res.status(400).json({ error: 'Command not allowed' });
    }
    
    exec(allowedCommands[commandKey], (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ output: stdout.trim() });
    });
});
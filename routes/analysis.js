const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();

router.post('/', async (req, res) => {
    const { sentence } = req.body;
    console.log("Analysis sentence: " + sentence);
    const process = spawn('python', ['emotionAnalysis.py', sentence]);

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
        output += data.toString();
    });

    process.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    process.on('close', (code) => {
        if (code === 0) {
            try {
                const result = JSON.parse(output);
                res.status(200).json(result);
            } catch (err) {
                res.status(500).json({ error: 'Invalid JSON response from Python script.' });
            }
        } else {
            res.status(500).json({ error: errorOutput.trim() || 'Unknown error occurred.' });
        }
    });
});

module.exports = router;

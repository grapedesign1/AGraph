#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Working directory passed as command-line argument
const workDir = process.argv[2] || __dirname;

// Change to working directory so replace-placeholders.js can find files
process.chdir(workDir);

// Read .env file from parent directory
const envPath = path.join(path.dirname(workDir), '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            value = value.replace(/^["']|["']$/g, '');
            const configKey = key.toLowerCase().replace('aesp_', '');
            process.env['npm_config_' + configKey] = value;
        }
    });
}

// Set process.argv for replace-placeholders.js with file in root
process.argv = ['node', 'replace-placeholders.js', './aesp.umd.js'];

// Execute replace-placeholders.js
require('./replace-placeholders.js');

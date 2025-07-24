// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const bcrypt = require('bcryptjs'); // For password hashing
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Parse URL-encoded bodies (from HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));
// Parse JSON bodies
app.use(bodyParser.json());

// Database configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false, // Set to true for Azure SQL or other cloud dbs (requires SSL)
        trustServerCertificate: true // Change to true for local dev / self-signed certs
    }
};

// Database connection pool
let pool;
async function connectDb() {
    try {
        pool = await sql.connect(dbConfig);
        console.log('Connected to SQL Server');
    } catch (err) {
        console.error('Database connection failed:', err);
        // Exit process or handle error gracefully in production
        process.exit(1); 
    }
}
connectDb();

// --- Routes to serve your HTML files ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Route for edit_profile.html
app.get('/edit-profile.html', (req, res) => { 
    res.sendFile(path.join(__dirname, 'public', 'edit_profile.html'));
});


// --- API Endpoints for Form Submissions ---

// Register Endpoint (MODIFIED for phoneNumber)
app.post('/api/register', async (req, res) => {
    const { fullName, email, employeeId, phoneNumber, password, confirmPassword } = req.body; // Added phoneNumber

    // Basic server-side validation
    if (!fullName || !email || !employeeId || !phoneNumber || !password || !confirmPassword) { // Added phoneNumber
        return res.status(400).send('All fields are required.');
    }
    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

        const request = pool.request();
        // Check if email or employeeId already exists
        const checkUser = await request
            .input('email', sql.NVarChar, email)
            .input('employeeId', sql.NVarChar, employeeId)
            .query('SELECT COUNT(*) AS count FROM Users WHERE email = @email OR employeeId = @employeeId');

        if (checkUser.recordset[0].count > 0) {
            return res.status(409).send('Email or Employee ID already registered.');
        }

        // Insert new user (MODIFIED to include phoneNumber)
        const result = await pool.request()
            .input('fullName', sql.NVarChar, fullName)
            .input('email', sql.NVarChar, email)
            .input('employeeId', sql.NVarChar, employeeId)
            .input('phoneNumber', sql.NVarChar, phoneNumber) // Added phoneNumber
            .input('password', sql.NVarChar, hashedPassword)
            .query('INSERT INTO Users (fullName, email, employeeId, phoneNumber, password) VALUES (@fullName, @email, @employeeId, @phoneNumber, @password)'); // Added phoneNumber to VALUES

        if (result.rowsAffected[0] === 1) {
            res.status(201).send('Registration successful!');
        } else {
            res.status(500).send('Failed to register user.');
        }

    } catch (err) {
        if (err.message.includes('Violation of UNIQUE KEY constraint')) {
            return res.status(409).send('Username or email already exists.'); // Or more specific error
        }
        console.error('Error during registration:', err);
        res.status(500).send('Server error during registration.');
    }
});

// Login Endpoint (MODIFIED to return user data)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required.');
    }

    try {
        const request = pool.request();
        const result = await request
            .input('email', sql.NVarChar, email)
            .query('SELECT id, fullName, email, employeeId, phoneNumber, password FROM Users WHERE email = @email'); // Added phoneNumber

        if (result.recordset.length === 0) {
            return res.status(401).send('Invalid email or password.');
        }

        const user = result.recordset[0];
        const isMatch = await bcrypt.compare(password, user.password); // Compare hashed password

        if (isMatch) {
            // Send user info upon successful login
            res.status(200).json({ 
                message: `Login successful! Welcome, ${user.fullName}`,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    employeeId: user.employeeId,
                    phoneNumber: user.phoneNumber // Added phoneNumber
                }
            });
        } else {
            res.status(401).send('Invalid email or password.');
        }

    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Server error during login.');
    }
});

// API Endpoint to get profile data for a specific user (MODIFIED to include phoneNumber)
app.get('/api/profile/:email', async (req, res) => {
    const userEmail = req.params.email; // Get email from URL parameter

    try {
        const result = await pool.request()
            .input('email', sql.NVarChar, userEmail)
            .query('SELECT fullName, email, employeeId, phoneNumber FROM Users WHERE email = @email'); // Added phoneNumber

        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ message: 'User profile not found.' });
        }
    } catch (err) {
        console.error('Error fetching profile data:', err);
        res.status(500).json({ message: 'Server error while fetching profile data.' });
    }
});

// API Endpoint to update profile data (MODIFIED to include phoneNumber)
app.put('/api/profile/update', async (req, res) => {
    const { originalEmail, fullName, email, employeeId, phoneNumber } = req.body; // Added phoneNumber

    if (!originalEmail || !fullName || !email || !employeeId || !phoneNumber) { // Added phoneNumber
        return res.status(400).send('All fields are required for update.');
    }

    try {
        const request = pool.request();

        // Check if the new email or employeeId already exists for *another* user
        const checkExisting = await request
            .input('newEmail', sql.NVarChar, email)
            .input('newEmployeeId', sql.NVarChar, employeeId)
            .input('originalEmail', sql.NVarChar, originalEmail)
            .query('SELECT COUNT(*) AS count FROM Users WHERE (email = @newEmail OR employeeId = @newEmployeeId) AND email != @originalEmail');

        if (checkExisting.recordset[0].count > 0) {
            return res.status(409).send('New Email or Employee ID is already in use by another account.');
        }

        // Update user data (MODIFIED to include phoneNumber)
        const result = await pool.request()
            .input('fullName', sql.NVarChar, fullName)
            .input('email', sql.NVarChar, email)
            .input('employeeId', sql.NVarChar, employeeId)
            .input('phoneNumber', sql.NVarChar, phoneNumber) // Added phoneNumber
            .input('originalEmail', sql.NVarChar, originalEmail)
            .query('UPDATE Users SET fullName = @fullName, email = @email, employeeId = @employeeId, phoneNumber = @phoneNumber WHERE email = @originalEmail'); // Added phoneNumber

        if (result.rowsAffected[0] === 1) {
            res.status(200).send('Profile updated successfully!');
        } else {
            res.status(404).send('User not found or no changes made.');
        }

    } catch (err) {
        console.error('Error during profile update:', err);
        res.status(500).send('Server error during profile update.');
    }
});

// API Endpoint for Logout (minimal, as no server-side sessions yet)
app.post('/api/logout', (req, res) => {
    // In a real app, this would invalidate a session or JWT on the server-side.
    // For now, it simply confirms the logout intent.
    res.status(200).send('Logged out successfully.');
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
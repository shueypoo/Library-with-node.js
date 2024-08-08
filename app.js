const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Set up the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set up middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

// Set up PostgreSQL connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
});

// Route for the sign-in page
app.get('/signin', (req, res) => {
    res.render('signin', { messages: req.flash('error') });
});

// Handle sign-in form submission
app.post('/signin', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM "Users" WHERE username = $1 AND password = $2', [username, password]);

        if (result.rows.length > 0) {
            req.session.user = result.rows[0];
            res.redirect('/');
        } else {
            req.flash('error', 'Invalid username or password.');
            res.redirect('/signin');
        }
    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).send('Server error');
    }
});

// Route for the home page
app.get('/', async (req, res) => {
    try {
        const { title, sort } = req.query;
        let query = 'SELECT * FROM "Books"';
        let queryParams = [];

        if (title) {
            queryParams.push(`%${title}%`);
            query += ` WHERE title ILIKE $${queryParams.length}`;
        }

        if (sort) {
            query += ` ORDER BY "borrowingTimes" ${sort === 'desc' ? 'DESC' : 'ASC'}`;
        }

        const result = await pool.query(query, queryParams);
        res.render('index', { rows: result.rows, title });
    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).send('Server error');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

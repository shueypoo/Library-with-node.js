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

// Route for the sign-in page
app.get('/signin', (req, res) => {
    res.render('signin', { messages: req.flash('error') });
});

// Handle sign-in form submission
app.post('/signin', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM "Users" WHERE username = $1', [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];

            if (password === user.password) {
                req.session.user = user;
                return res.redirect('/dashboard');
            } else {
                req.flash('error', 'Invalid username or password.');
                return res.redirect('/signin');
            }
        } else {
            req.flash('error', 'Invalid username or password.');
            return res.redirect('/signin');
        }
    } catch (err) {
        console.error('Error querying database:', err);
        req.flash('error', 'An error occurred. Please try again.');
        return res.redirect('/signin');
    }
});

// Add the /dashboard route here
app.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'Please sign in to access the dashboard.');
        return res.redirect('/signin');
    }

    try {
        const { title } = req.query;
        let query = 'SELECT * FROM "Books"';
        let queryParams = [];

        if (title) {
            queryParams.push(`%${title}%`);
            query += ` WHERE title ILIKE $${queryParams.length}`;
        }

        const result = await pool.query(query, queryParams);
        res.render('dashboard', { user: req.session.user, rows: result.rows, title });
    } catch (error) {
        console.error('Error querying database:', error);
        req.flash('error', 'An error occurred while loading the dashboard.');
        res.redirect('/signin');
    }
});

// New Route to handle book selection and borrowing
app.post('/dashboard/select', async (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'Please sign in to borrow books.');
        return res.redirect('/signin');
    }

    const selectedBooks = req.body.selected_books;

    if (!selectedBooks || selectedBooks.length === 0) {
        req.flash('error', 'No books selected.');
        return res.redirect('/dashboard');
    }

    try {
        // Step 1: Insert a new record into the BorrowingActivity table
        const borrowDate = new Date();
        const activityResult = await pool.query(
            `INSERT INTO "BorrowingActivity" ("userId", "borrowDate") VALUES ($1, $2) RETURNING "activityId"`,
            [req.session.user.id, borrowDate]
        );
        const activityId = activityResult.rows[0].activityId;

        // Step 2: Insert records into the BorrowingDetails table for each selected book
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14); // Set due date to 14 days from today

        for (let bookId of selectedBooks) {
            await pool.query(
                `INSERT INTO "BorrowingDetails" ("activityId", "bookId", "dueDate") VALUES ($1, $2, $3)`,
                [activityId, bookId, dueDate]
            );

            // Step 3: Update the borrowingTimes for each selected book
            await pool.query(
                `UPDATE "Books" SET "borrowingTimes" = "borrowingTimes" + 1 WHERE id = $1`,
                [bookId]
            );
        }

        req.flash('success', 'Books borrowed successfully.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error processing book order:', err);
        req.flash('error', 'An error occurred while borrowing books. Please try again.');
        res.redirect('/dashboard');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

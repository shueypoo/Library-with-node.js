const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
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

// Routes

// Route for the home page
app.get('/', async (req, res) => {
    try {
        const { title } = req.query;
        let query = 'SELECT * FROM "Books"';
        let queryParams = [];

        if (title) {
            queryParams.push(`%${title}%`);
            query += ` WHERE title ILIKE $${queryParams.length}`;
        }

        const result = await pool.query(query, queryParams);
        res.render('index', { rows: result.rows, title: title || '' });
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
        // Query the Users table for the provided username
        const result = await pool.query('SELECT * FROM "Users" WHERE username = $1', [username]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            
            // Check if the password matches (this assumes the password is stored in plain text; in reality, you should hash it)
            if (password === user.password) {
                // Store user info in session
                req.session.user = user;
                
                // Redirect to the dashboard page after successful sign-in
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

// Route for the dashboard page
app.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'Please sign in to access the dashboard.');
        return res.redirect('/signin');
    }

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
		
		// Pass flash messages to the view
        res.render('dashboard', { 
            rows: result.rows, 
            title, 
            user: req.session.user, 
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });

    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).send('Server error');
    }
});

// Handle book selection and order
app.post('/dashboard/select', async (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'Please sign in to select books.');
        return res.redirect('/signin');
    }

    const selectedBooks = req.body.selected_books;

    if (!selectedBooks) {
        req.flash('error', 'No books selected.');
        return res.redirect('/dashboard');
    }

	try {
        // Insert into BorrowingActivity table
        const activityResult = await pool.query(
            'INSERT INTO "BorrowingActivity" ("userId", "borrowDate") VALUES ($1, NOW()) RETURNING "activityId"',
            [req.session.user.id]
        );

        const activityId = activityResult.rows[0].activityId; // Get the new activityId

        // Insert into BorrowingDetails table
        for (let bookId of selectedBooks) {
            await pool.query(
                'INSERT INTO "BorrowingDetails" ("activityId", "bookId") VALUES ($1, $2)',
                [activityId, bookId]
            );
        }
		
        req.flash('success', 'Books ordered successfully.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error processing order:', err);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/dashboard');
    }
});

// Automated task: Send reminder emails 2 days before a book is due
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily task to check for due books.');

    try {
        const dueDateThreshold = new Date();
        dueDateThreshold.setDate(dueDateThreshold.getDate() + 2); // 2 days before due date

        const query = `
            SELECT u.username, u.email, b.title, ba.dueDate
            FROM "BorrowingActivity" ba
            JOIN "Users" u ON ba.userId = u.id
            JOIN "Books" b ON ba.bookId = b.id
            WHERE ba.dueDate = $1
        `;

        const result = await pool.query(query, [dueDateThreshold.toISOString().slice(0, 10)]);

        if (result.rows.length > 0) {
            const transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            for (const row of result.rows) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: row.email,
                    subject: 'Book Due Reminder',
                    text: `Hello ${row.username},\n\nThis is a reminder that the book "${row.title}" is due in 2 days (on ${row.dueDate}). Please return it on time to avoid any late fees.\n\nThank you!`
                };

                await transporter.sendMail(mailOptions);
                console.log(`Reminder email sent to ${row.email}`);
            }
        } else {
            console.log('No due books found.');
        }
    } catch (err) {
        console.error('Error in daily task:', err);
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

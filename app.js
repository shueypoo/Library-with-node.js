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

// Add the /dashboard route here
app.get('/dashboard', async (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        req.flash('error', 'Please sign in to access the dashboard.');
        return res.redirect('/signin');
    }
	
    const { title } = req.query || ''; // Get title from query string, or default to an empty string
 
	console.log("Title:", title); // Debugging line
 
	try {
        let query = 'SELECT * FROM "Books"';
        let queryParams = [];

        if (title) {
            queryParams.push(`%${title}%`);
            query += ` WHERE title ILIKE $${queryParams.length}`;
        }

        const result = await pool.query(query, queryParams);
        res.render('dashboard', {
            user: req.session.user,
            rows: result.rows,
            title: title
        });
    } catch (err) {
        console.error('Error querying the database:', err);
        req.flash('error', 'An error occurred. Please try again.');
        return res.redirect('/signin');
    }
});

app.post('/dashboard/select', (req, res) => {
    // Retrieve the selected books from the form
    const selectedBooks = req.body.selected_books;

    // If no books are selected, redirect back with a message
    if (!selectedBooks) {
        req.flash('error', 'No books were selected.');
        return res.redirect('/dashboard');
    }

    // Handle the selected books (e.g., store in the database, create an order, etc.)
    console.log('Selected Books:', selectedBooks);

    // You might want to do something with the selected books here, like saving an order in the database.

    // Redirect to a confirmation page or back to the dashboard
    req.flash('success', 'Your books have been ordered successfully.');
    res.redirect('/dashboard');
});


// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

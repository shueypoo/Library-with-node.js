const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { format } = require('date-fns');

dotenv.config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Library',
  password: 'postgres',
  port: 5432,
});

const fetchDueBooks = async () => {
  const dueDate = format(new Date(new Date().setDate(new Date().getDate() + 2)), 'yyyy-MM-dd');
  const query = `
    SELECT u."emailId" AS email, b.title, bd."dueDate"
    FROM "BorrowingDetails" bd
    JOIN "BorrowingActivity" ba ON bd."activityId" = ba."activityId"
    JOIN "Users" u ON ba."userId" = u.id
    JOIN "Books" b ON bd."bookId" = b.id
    WHERE bd."dueDate" = $1
  `;
  const { rows } = await pool.query(query, [dueDate]);
  return rows;
};

const logEmailSent = async (recipient, subject, body) => {
  const query = `
    INSERT INTO "sEmailH" ("dateTime", "email", "subject", "body")
    VALUES (CURRENT_TIMESTAMP, $1, $2, $3)
  `;
  await pool.query(query, [recipient, subject, body]);
};

const sendEmail = async (recipient, booksDue) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const subject = 'Library Book Due Reminder';
  let body = 'Dear User,\n\nThis is a reminder that the following books are due in 2 days:\n';
  booksDue.forEach(book => {
    body += `- ${book.title} (Due on ${book.dueDate})\n`;
  });
  body += '\nPlease return them on time to avoid any late fees.\n\nThank you!';

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipient,
    subject: subject,
    text: body,
  };

  try {
    await transporter.sendMail(mailOptions);
    await logEmailSent(recipient, subject, body);
    console.log(`Email sent to ${recipient}`);
  } catch (error) {
    console.error(`Failed to send email to ${recipient}: ${error}`);
  }
};

const main = async () => {
  const dueBooks = await fetchDueBooks();
  const usersBooks = dueBooks.reduce((acc, row) => {
    if (!acc[row.email]) {
      acc[row.email] = [];
    }
    acc[row.email].push(row);
    return acc;
  }, {});

  for (const [email, booksDue] of Object.entries(usersBooks)) {
    await sendEmail(email, booksDue);
  }
};

main().catch(console.error);

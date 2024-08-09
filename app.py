from flask import Flask, render_template, request, redirect, url_for, flash, session
import psycopg2
import psycopg2.extras
from psycopg2 import sql
from datetime import datetime, timedelta, date

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Needed for flashing messages


# # Database connection setup
# conn = psycopg2.connect(
#     host="localhost",
#     database="Library",
#     user="postgres",
#     password="postgres",
#     port="5432"
# )
#

# old
def get_db_connection():
    conn1 = psycopg2.connect(
        dbname='Library',
        user='postgres',
        password='postgres',
        host='localhost',
        port=5432
    )
    return conn1


# new
# @app.route('/')
# def home():
#     return render_template('index.html')

# old
@app.route('/')
def index():
    title = request.args.get('title')
    sort_order = request.args.get('sort', 'asc')
    conn2 = get_db_connection()
    cur = conn2.cursor()

    base_query = 'SELECT * FROM "Books"'
    where_clause = ''
    order_clause = ' ORDER BY "borrowingTimes" ' + ('ASC' if sort_order == 'asc' else 'DESC')

    if title:
        where_clause = ' WHERE title ILIKE %s'
        cur.execute('SELECT * FROM "Books" WHERE title ILIKE %s', ('%' + title + '%',))
    else:
        cur.execute(base_query + order_clause)

    rows = cur.fetchall()
    cur.close()
    conn2.close()
    return render_template('index.html', rows=rows)


# new
# @app.route('/signin', methods=['GET', 'POST'])
# def signin():
#     if request.method == 'POST':
#         username = request.form['username']
#         password = request.form['password']
#         cur = conn.cursor()
#         cur.execute("SELECT * FROM Users WHERE username = %s AND password = %s", (username, password))
#         user = cur.fetchone()
#         if user:
#             return redirect(url_for('dashboard', user_id=user[0]))
#         else:
#             flash('Something is wrong', 'error')
#     return render_template('signin.html')

# old
@app.route('/signin', methods=['GET', 'POST'])
def signin():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn3 = get_db_connection()
        cur = conn3.cursor(cursor_factory=psycopg2.extras.DictCursor)

        cur.execute('SELECT * FROM "Users" WHERE username = %s AND password = %s', (username, password))
        user = cur.fetchone()

        cur.close()
        conn3.close()

        if user:
            # Store user data in session
            session['user'] = {
                'id': user['id'],  # Ensure id is stored
                'username': user['username'],
                'first_name': user['firstName'],  # Correct column name
                'last_name': user['lastName']  # Correct column name
            }
            return redirect(url_for('dashboard'))
        else:
            flash('Something is wrong')
            return redirect(url_for('signin'))

    return render_template('signin.html')


@app.route('/dashboard', methods=['GET', 'POST'])
def dashboard():
    user = session.get('user')
    if not user:
        return redirect(url_for('signin'))  # Ensure user is logged in
    # old
    # user_id = request.args.get('user_id')
    # cur = conn.cursor()
    # cur.execute('SELECT * FROM "Users" WHERE id = %s', (user_id,))
    # user = cur.fetchone()

    title = request.args.get('title', '')
    conn4 = get_db_connection()
    cur = conn4.cursor(cursor_factory=psycopg2.extras.DictCursor)

    if title:
        cur.execute('SELECT * FROM "Books" WHERE title ILIKE %s', ('%' + title + '%',))
    else:
        cur.execute('SELECT * FROM "Books"')
    rows = cur.fetchall()
    # cur.close()

    # old
    # title = request.args.get('title', '')
    # if title:
    #     cur.execute('SELECT * FROM "Books" WHERE title ILIKE %s', ('%' + title + '%',))
    # else:
    #     cur.execute('SELECT * FROM "Books"')
    # rows = cur.fetchall()

    if request.method == 'POST':
        selected_books = request.form.getlist('selected_books')
        if selected_books:
            # cur = conn4.cursor()
            borrow_date = date.today()  # Set the borrow date to the current date and time
            due_date = borrow_date + timedelta(days=14)  # Set due date 14 days from the borrow date

            # Insert into BorrowingActivity
            cur.execute('INSERT INTO "BorrowingActivity" ("userId", "borrowDate") VALUES (%s, %s) RETURNING '
                        '"activityId"',
                        (user['id'], borrow_date))
            activity_id = cur.fetchone()['activityId']  # Retrieve the generated activityId

            # Insert into BorrowingDetails
            for book_id in selected_books:
                # new
                # cur.execute(
                #     'INSERT INTO "BorrowingDetails" ("activityId", "bookId", "dueDate", "returnDate", "renewalTimes", '
                #     '"overdue") VALUES (%s, %s, NULL, NULL, 0, FALSE)',
                #     (activity_id, book_id))

                # old
                cur.execute('INSERT INTO "BorrowingDetails" ("activityId", "bookId", "dueDate", "returnDate", '
                            '"renewalTimes", "overdue") VALUES (%s, %s, %s, %s, %s, %s)',
                            (activity_id, book_id, due_date, None, 0, False))

            conn4.commit()
            flash('You have successfully borrowed the book(s). Enjoy', 'success')

        else:
            flash('No books selected', 'error')
        return redirect(url_for('dashboard'))

    cur.close()
    conn4.close()
    return render_template('dashboard.html', user=user, rows=rows)

    # old
    # if request.method == 'POST':
    #     selected_books = request.form.getlist('selected_books')
    #     if selected_books:
    #         cur = conn.cursor()
    #         cur.execute('INSERT INTO "BorrowingActivity" (user_id) VALUES (%s) RETURNING id', (user['id'],))
    #         borrowing_id = cur.fetchone()[0]
    #         for book_id in selected_books:
    #             cur.execute('INSERT INTO "BorrowingDetails" (borrowing_id, book_id) VALUES (%s, %s)',
    #                         (borrowing_id, book_id))
    #         conn.commit()
    #         cur.close()
    #         flash('You have successfully borrowed the book(s). Enjoy', 'success')
    #     else:
    #         flash('No books selected', 'error')
    #     return redirect(url_for('dashboard'))
    #
    # return render_template('dashboard.html', user=user, rows=rows)

    # old
    # if request.method == 'POST':
    #     selected_books = request.form.getlist('selected_books')
    #     if selected_books:
    #         cur.execute('INSERT INTO "BorrowingActivity" (user_id) VALUES (%s) RETURNING id', (user_id,))
    #         borrowing_id = cur.fetchone()[0]
    #         for book_id in selected_books:
    #             cur.execute('INSERT INTO "BorrowingDetails" (borrowing_id, book_id) VALUES (%s, %s)',
    #                         (borrowing_id, book_id))
    #         conn.commit()
    #         flash('You have successfully borrowed the book(s). Enjoy', 'success')
    #     else:
    #         flash('No books selected', 'error')
    #     return redirect(url_for('dashboard', user_id=user_id))

    # @app.route('/dashboard', methods=['GET', 'POST'])
    # def dashboard():
    #     user = session.get('user')
    #     if not user:
    #         return redirect(url_for('signin'))
    #
    #     title = request.args.get('title')
    #     conn = get_db_connection()
    #     cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    #
    #     if title:
    #         cur.execute('SELECT * FROM "Books" WHERE title ILIKE %s', ('%' + title + '%',))
    #     else:
    #         cur.execute('SELECT * FROM "Books"')
    #
    #     rows = cur.fetchall()
    #     cur.close()
    #     conn.close()
    #     return render_template('dashboard.html', user=user, rows=rows)

    # old
    # return render_template('dashboard.html', user=user, rows=rows)


# @app.route('/order', methods=['POST'])
# def order():
#     selected_books = request.form.getlist('selected_books')
#     # Process the order (e.g., save to database, send email, etc.)
#     flash('Order placed successfully')
#     return redirect(url_for('dashboard'))


if __name__ == '__main__':
    app.run(debug=True)

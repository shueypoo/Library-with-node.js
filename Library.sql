--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

-- Started on 2024-08-04 13:20:27

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 216 (class 1259 OID 16406)
-- Name: Books; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Books" (
    id integer NOT NULL,
    title text,
    author text,
    description text,
    "ISBN" text,
    copies integer,
    "borrowingTimes" integer
);


ALTER TABLE public."Books" OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16413)
-- Name: BorrowingActivity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BorrowingActivity" (
    "activityId" integer NOT NULL,
    "userId" integer,
    "borrowDate" date
);


ALTER TABLE public."BorrowingActivity" OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16418)
-- Name: BorrowingDetails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BorrowingDetails" (
    id integer NOT NULL,
    "activityId" integer,
    "bookId" integer,
    "dueDate" date,
    "returnDate" date,
    "renewalTimes" integer,
    overdue boolean
);


ALTER TABLE public."BorrowingDetails" OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 16399)
-- Name: Users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Users" (
    id integer NOT NULL,
    "firstName" text,
    "lastName" text,
    "homeAddress" text,
    telephone text,
    "emailId" text,
    username text,
    password text
);


ALTER TABLE public."Users" OWNER TO postgres;

--
-- TOC entry 4851 (class 0 OID 16406)
-- Dependencies: 216
-- Data for Name: Books; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Books" (id, title, author, description, "ISBN", copies, "borrowingTimes") FROM stdin;
1	a	b	c	d	2	3
11	aa	bb	cc	dd	22	33
2	e	f	g	h	4	5
\.


--
-- TOC entry 4852 (class 0 OID 16413)
-- Dependencies: 217
-- Data for Name: BorrowingActivity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BorrowingActivity" ("activityId", "userId", "borrowDate") FROM stdin;
\.


--
-- TOC entry 4853 (class 0 OID 16418)
-- Dependencies: 218
-- Data for Name: BorrowingDetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BorrowingDetails" (id, "activityId", "bookId", "dueDate", "returnDate", "renewalTimes", overdue) FROM stdin;
\.


--
-- TOC entry 4850 (class 0 OID 16399)
-- Dependencies: 215
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" (id, "firstName", "lastName", "homeAddress", telephone, "emailId", username, password) FROM stdin;
1	a	b	12 sb	123	21@	abcd	1234
\.


--
-- TOC entry 4702 (class 2606 OID 16412)
-- Name: Books Books_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Books"
    ADD CONSTRAINT "Books_pkey" PRIMARY KEY (id);


--
-- TOC entry 4704 (class 2606 OID 16417)
-- Name: BorrowingActivity BorrowingActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BorrowingActivity"
    ADD CONSTRAINT "BorrowingActivity_pkey" PRIMARY KEY ("activityId");


--
-- TOC entry 4706 (class 2606 OID 16422)
-- Name: BorrowingDetails BorrowingDetails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BorrowingDetails"
    ADD CONSTRAINT "BorrowingDetails_pkey" PRIMARY KEY (id);


--
-- TOC entry 4700 (class 2606 OID 16405)
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);


-- Completed on 2024-08-04 13:20:27

--
-- PostgreSQL database dump complete
--


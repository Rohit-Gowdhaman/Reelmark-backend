# REELMARK

A film review platform. Browse, search, and filter reviews, write your own, and manage everything from a profile page or an admin dashboard.

- **Frontend:** https://reelmark-frontend.vercel.app (plain HTML, CSS, and JavaScript)
- **Backend API:** https://reelmark-backend-hrqa.onrender.com (Node.js + Express)
- **Database:** PostgreSQL on [Neon](https://neon.com)
- **Health check:** https://reelmark-backend-hrqa.onrender.com/api/health

## Features

- Browse all reviews, search by title or director, filter by genre, sort by rating, year, or title
- "Shuffle a pick" button for a random review
- User registration and login (JWT authentication, tokens last 1 hour)
- Add reviews with movie lookup by title and year (poster, director, genre, and runtime come from OMDb)
- Edit and delete your own reviews
- Profile page with your reviews
- Admin dashboard: all users, role changes, all reviews, and analytics (users, ratings, reviews by genre and year)
- 8 sample reviews of real films, loaded automatically on first start

## Architecture

```
Browser  ->  Vercel (static frontend)  ->  Render (Express API)  ->  Neon (PostgreSQL)
                                                  |
                                                  +-> OMDb (movie posters and details)
```

The frontend is a static site. It calls the backend using the URL in `config.js`. All data (users, reviews) lives in PostgreSQL, so it survives backend restarts and redeploys.

## Project structure

**Frontend repo** (`Reelmark-frontend`)

```
index.html          Home: review grid, search, filters
login.html          Login
register.html       Registration
add-review.html     Create / edit a review
profile.html        Logged-in user's profile
admin.html          Admin dashboard
config.js           Backend URL (API_BASE_URL)
session.js          authenticatedFetch() helper and logout
auth.js             Route protection and token expiry check
script.js, login.js, register.js, review-form.js, profile.js, admin.js
style.css
```

**Backend repo** (`Reelmark-backend`)

```
server.js                          Express app and route mounting
src/db.js                          PostgreSQL connection and schema setup
src/seed.js                        Admin account, sample reviews, poster lookup
src/controllers/auth.controllers.js
src/middleware/auth.middleware.js  Verifies the JWT
src/middleware/admin.middleware.js Checks the user's role in the database
src/routes/                        auth, reviews, genres, newsletter, admin
src/service/omdb.service.js        OMDb movie lookup
```

## Environment variables (backend)

Set these in **Render > your service > Environment**. For local development, copy `.env.example` to `.env`.

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | Yes | Neon connection string (`postgresql://user:password@host/dbname?sslmode=require`). The server will not start without it. |
| `JWT_SECRET` | Yes | A long random string used to sign login tokens. Keep it unchanged, because changing it logs everyone out. |
| `CORS_ORIGIN` | Yes | The exact frontend URL, for example `https://reelmark-frontend.vercel.app`. **No trailing slash.** |
| `ADMIN_EMAIL` | Yes | Email of the admin account |
| `ADMIN_PASSWORD` | Yes | Password for the admin account (used when the account is first created) |
| `ADMIN_NAME` | No | Display name for the admin (default `Admin`) |
| `OMDB_API_KEY` | Recommended | Free key from [omdbapi.com](https://www.omdbapi.com). Needed for movie lookup and posters. |
| `PORT` | No | Defaults to `4000`. Render sets this for you. |

**Never commit real secrets.** `.env` must stay in `.gitignore`. Only `.env.example`, with placeholder values, belongs in the repository.

## Database (PostgreSQL on Neon)

1. Create a free project at [neon.com](https://neon.com).
2. Click **Connect** and copy the connection string (with the password shown).
3. Add it as `DATABASE_URL` on Render.

The tables (`users`, `reviews`, `newsletter_subscribers`) are created automatically on start. To look at the data, open your project in Neon and use **Tables** or the **SQL Editor**, for example:

```sql
SELECT id, name, email, role FROM users ORDER BY id;
```

## Admin setup

The admin account is created automatically by `src/seed.js` every time the backend starts. You do not run SQL for this.

1. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and (optionally) `ADMIN_NAME` on Render.
2. Deploy. The log shows `Admin ready: ...`.
3. Log in on the site with that email and password. The **Admin Dashboard** button appears in the top menu.

How it behaves:

- If no user has that email, the admin is **created**.
- If a user with that email already exists, that user is **promoted to admin** (their password is not changed).
- The admin check always reads the role from the database, so changing a role takes effect on the next request.

To make another user an admin, use the role control on the admin dashboard.

## Sample data

On the first start, the seed loads 8 sample reviews of real films (*Past Lives*, *Arrival*, *Gone Girl*, *The Grand Budapest Hotel*, *Hereditary*, *Spider-Man: Into the Spider-Verse*, *Moonlight*, *Parasite*), owned by the admin account. If `OMDB_API_KEY` is set, their posters are fetched from OMDb. Missing posters are retried on every start. Reviews written by users are never touched by the seed.

## Run locally

**Backend**

```bash
git clone https://github.com/Rohit-Gowdhaman/Reelmark-backend.git
cd Reelmark-backend
npm install
cp .env.example .env     # then edit .env with your values
npm run dev              # or: npm start
```

**Frontend**

The frontend needs no build. Serve the folder over HTTP, for example with the VS Code **Live Server** extension, or:

```bash
cd Reelmark-frontend
python -m http.server 5500
```

Then open `http://localhost:5500`. For local testing, set `API_BASE_URL` in `config.js` to `http://localhost:4000`, and set `CORS_ORIGIN` in the backend `.env` to `http://localhost:5500`. Change both back before deploying.

## Deployment

| Part | Platform | Settings |
|---|---|---|
| Frontend | Vercel | Framework preset **Other**, no build command, project name in lowercase |
| Backend | Render (Web Service) | Build command `npm install`, start command `npm start` |
| Database | Neon | Copy the connection string into `DATABASE_URL` |

Both Vercel and Render redeploy automatically when you push to `main`.

## API overview

| Area | Endpoints |
|---|---|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Reviews | `GET /api/reviews`, `POST /api/reviews`, `PUT` / `DELETE /api/reviews/:id`, `GET /api/reviews/my`, `GET /api/reviews/search-movie` |
| Genres | `GET /api/genres` |
| Newsletter | `POST /api/newsletter` |
| Admin | `GET /api/admin/users`, `PUT /api/admin/users/:id/role`, `DELETE /api/admin/users/:id`, `GET /api/admin/reviews`, `PUT` / `DELETE /api/admin/reviews/:id`, `GET /api/admin/analytics` |

Protected routes expect `Authorization: Bearer <token>`. Admin routes also require the user to be an admin in the database.

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Home page says "Unable to load reviews" | Browser console shows a CORS error: check that `CORS_ORIGIN` on Render is exactly the frontend URL with **no trailing slash**, then redeploy |
| First page load is very slow | Render's free plan sleeps when idle. Wait up to a minute and reload. Data is safe in Neon. |
| Backend crashes with `DATABASE_URL is missing` | Add `DATABASE_URL` on Render and redeploy |
| Admin dashboard shows zeros or empty lists | Login tokens expire after 1 hour. Log out and log in again. If you get a 401 or 403, check that you are logged in as the admin account. |
| No posters on the home page | Check that `OMDB_API_KEY` is set on Render, then restart the service. The log shows `Posters added: N`. |
| `SECURITY WARNING: The SSL modes ...` in the log | Harmless. To silence it, change `sslmode=require` to `sslmode=verify-full` at the end of `DATABASE_URL`. |

## Tech stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+, Fetch API)
- **Backend:** Node.js, Express, `pg`, `jsonwebtoken`, `bcryptjs`, `cors`
- **Database:** PostgreSQL (Neon)
- **Hosting:** Vercel (frontend), Render (backend)
- **Movie data:** OMDb API

## License

Add your preferred license here (for example MIT).

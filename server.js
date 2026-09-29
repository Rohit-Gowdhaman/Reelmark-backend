// server.js
// Entry point: sets up Express, mounts API routes, and (optionally) serves
// the static frontend (index.html / styles.css / script.js) from ./public.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const reviewsRoutes = require('./src/routes/reviews.routes');
const genresRoutes = require('./src/routes/genres.routes');
const newsletterRoutes = require('./src/routes/newsletter.routes');
const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/admin.routes');


const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.JWT_SECRET) {
    throw new Error(
        'JWT_SECRET is missing from environment variables'
    );
}

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// API
app.use('/api/reviews', reviewsRoutes);
app.use('/api/genres', genresRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Static frontend (copy index.html, styles.css, script.js into ./public to use this)
// Static frontend (copy index.html, styles.css, script.js into ./public and changed to forentend)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api', (req, res) => {
    res.status(404).json({
        error: 'Not found'
    });
});

app.listen(PORT, () => {
    console.log(`Reelmark API running on http://localhost:${PORT}`);
});
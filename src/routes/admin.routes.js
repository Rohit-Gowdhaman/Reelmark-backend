const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const router = express.Router();
const { searchMovie } = require('../service/omdb.service');

// TEST ADMIN ACCESS
router.get(
    '/test',
    authMiddleware,
    adminMiddleware,
    (req, res) => {

        res.json({
            message: 'Welcome Admin! You have admin access.',
            user: req.user
        });

    }
);

// GET ALL USERS - ADMIN ONLY
router.get(
    '/users',
    authMiddleware,
    adminMiddleware,
    (req, res) => {

        try {

            const users = db.prepare(`
                SELECT
                    id,
                    name,
                    email,
                    role,
                    created_at
                FROM users
                ORDER BY created_at DESC
            `).all();

            res.json(users);

        } catch (error) {

            console.error('Failed to fetch users:', error);

            res.status(500).json({
                error: 'Failed to fetch users'
            });

        }

    }
);

// CHANGE USER ROLE - ADMIN ONLY
router.put(
    '/users/:id/role',
    authMiddleware,
    adminMiddleware,
    (req, res) => {

        try {

            const userId = Number(req.params.id);
            const { role } = req.body;


            // Check valid role
            if (role !== 'user' && role !== 'admin') {

                return res.status(400).json({
                    error: 'Role must be user or admin'
                });

            }


            // Prevent admin from changing their own role
            if (userId === req.user.id) {

                return res.status(400).json({
                    error: 'You cannot change your own role'
                });

            }


            // Check if user exists
            const existingUser = db.prepare(
                'SELECT id, name, email, role FROM users WHERE id = ?'
            ).get(userId);


            if (!existingUser) {

                return res.status(404).json({
                    error: 'User not found'
                });

            }


            // Update role
            db.prepare(
                'UPDATE users SET role = ? WHERE id = ?'
            ).run(role, userId);


            // Get updated user
            const updatedUser = db.prepare(`
                SELECT
                    id,
                    name,
                    email,
                    role,
                    created_at
                FROM users
                WHERE id = ?
            `).get(userId);


            res.json({
                message: 'User role updated successfully',
                user: updatedUser
            });


        } catch (error) {

            console.error(
                'Failed to update user role:',
                error
            );

            res.status(500).json({
                error: 'Failed to update user role'
            });

        }

    }
);

// ==========================================
// GET ALL REVIEWS - ADMIN ONLY
// ==========================================

// ==========================================
// GET ALL REVIEWS - ADMIN ONLY
// ==========================================

router.get(
    '/reviews',
    authMiddleware,
    adminMiddleware,
    (req, res) => {

        try {

            const reviews = db.prepare(`
                SELECT
                    reviews.id,
                    reviews.user_id,
                    reviews.title,
                    reviews.year,
                    reviews.genre,
                    reviews.director,
                    reviews.runtime,
                    reviews.rating,
                    reviews.blurb,
                    reviews.review,
                    reviews.verdict,
                    reviews.icon,
                    reviews.colors,
                    reviews.tags,
                    reviews.critic,
                    reviews.published,
                    reviews.created_at,

                    users.name AS user_name,
                    users.email AS user_email

                FROM reviews

                LEFT JOIN users
                    ON reviews.user_id = users.id

                ORDER BY reviews.created_at DESC
            `).all();


            res.json(reviews);


        } catch (error) {

            console.error(
                'Failed to fetch all reviews:',
                error
            );


            res.status(500).json({
                error: 'Failed to fetch reviews'
            });

        }

    }
);

// ==========================================
// EDIT ANY REVIEW - ADMIN ONLY
// ==========================================

router.put(
    '/reviews/:id',
    authMiddleware,
    adminMiddleware,
    (req, res) => {

        try {

            const reviewId =
                Number(req.params.id);


            // Get data from request
            const {
                title,
                year,
                genre,
                director,
                runtime,
                rating,
                blurb,
                review,
                verdict,
                icon,
                colors,
                tags,
                critic,
                published
            } = req.body;


            // ======================================
            // CHECK REQUIRED FIELDS
            // ======================================

            if (
                !title ||
                !year ||
                !genre ||
                !director ||
                !runtime ||
                rating === undefined ||
                !blurb ||
                !review ||
                !verdict ||
                !icon ||
                !colors ||
                !tags ||
                !critic ||
                !published
            ) {

                return res.status(400).json({
                    error: 'All review fields are required'
                });

            }


            // ======================================
            // CHECK IF REVIEW EXISTS
            // ======================================

            const existingReview =
                db.prepare(`
                    SELECT
                        id,
                        user_id
                    FROM reviews
                    WHERE id = ?
                `).get(reviewId);


            if (!existingReview) {

                return res.status(404).json({
                    error: 'Review not found'
                });

            }


            // ======================================
            // UPDATE REVIEW
            // ======================================

            db.prepare(`
                UPDATE reviews
                SET
                    title = ?,
                    year = ?,
                    genre = ?,
                    director = ?,
                    runtime = ?,
                    rating = ?,
                    blurb = ?,
                    review = ?,
                    verdict = ?,
                    icon = ?,
                    colors = ?,
                    tags = ?,
                    critic = ?,
                    published = ?
                WHERE id = ?
            `).run(
                title,
                Number(year),
                genre,
                director,
                Number(runtime),
                Number(rating),
                blurb,
                review,
                verdict,
                icon,
                colors,
                tags,
                critic,
                published,
                reviewId
            );


            // ======================================
            // GET UPDATED REVIEW
            // ======================================

            const updatedReview =
                db.prepare(`
                    SELECT
                        reviews.id,
                        reviews.user_id,
                        reviews.title,
                        reviews.year,
                        reviews.genre,
                        reviews.director,
                        reviews.runtime,
                        reviews.rating,
                        reviews.blurb,
                        reviews.review,
                        reviews.verdict,
                        reviews.icon,
                        reviews.colors,
                        reviews.tags,
                        reviews.critic,
                        reviews.published,
                        reviews.created_at,

                        users.name AS user_name,
                        users.email AS user_email

                    FROM reviews

                    LEFT JOIN users
                        ON reviews.user_id = users.id

                    WHERE reviews.id = ?
                `).get(reviewId);


            // ======================================
            // SUCCESS RESPONSE
            // ======================================

            res.json({

                message:
                    'Review updated successfully',

                review:
                    updatedReview

            });


        } catch (error) {

            console.error(
                'Failed to update review:',
                error
            );


            res.status(500).json({
                error: 'Failed to update review'
            });

        }

    }
);

// ==========================================
// DELETE ANY REVIEW - ADMIN ONLY
// ==========================================

router.delete(
    '/reviews/:id',
    authMiddleware,
    adminMiddleware,
    (req, res) => {

        try {

            const reviewId =
                Number(req.params.id);


            // Check whether review exists

            const existingReview =
                db.prepare(`
                    SELECT
                        id,
                        title,
                        user_id
                    FROM reviews
                    WHERE id = ?
                `).get(reviewId);


            if (!existingReview) {

                return res.status(404).json({
                    error: 'Review not found'
                });

            }


            // Delete review

            db.prepare(`
                DELETE FROM reviews
                WHERE id = ?
            `).run(reviewId);


            // Send response

            res.json({

                message:
                    'Review deleted successfully',

                review: existingReview

            });


        } catch (error) {

            console.error(
                'Failed to delete review:',
                error
            );


            res.status(500).json({

                error:
                    'Failed to delete review'

            });

        }

    }
);

// ==========================================
// ADMIN ANALYTICS
// ==========================================

router.get(
    '/analytics',
    authMiddleware,
    adminMiddleware,
    (req, res) => {

        try {

            // ==================================
            // TOTAL USERS
            // ==================================

            const totalUsers =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM users
                `).get().count;


            // ==================================
            // TOTAL ADMINS
            // ==================================

            const totalAdmins =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM users
                    WHERE role = 'admin'
                `).get().count;


            // ==================================
            // NORMAL USERS
            // ==================================

            const totalNormalUsers =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM users
                    WHERE role = 'user'
                `).get().count;


            // ==================================
            // TOTAL REVIEWS
            // ==================================

            const totalReviews =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM reviews
                `).get().count;


            // ==================================
            // AVERAGE RATING
            // ==================================

            const averageRating =
                db.prepare(`
                    SELECT
                        AVG(rating) AS average
                    FROM reviews
                `).get().average;


            // ==================================
            // REVIEWS BY GENRE
            // ==================================

            const reviewsByGenre =
                db.prepare(`
                    SELECT
                        genre,
                        COUNT(*) AS count
                    FROM reviews
                    GROUP BY genre
                    ORDER BY count DESC
                `).all();


            // ==================================
            // REVIEWS BY YEAR
            // ==================================

            const reviewsByYear =
                db.prepare(`
                    SELECT
                        year,
                        COUNT(*) AS count
                    FROM reviews
                    GROUP BY year
                    ORDER BY year DESC
                `).all();


            // ==================================
            // SEND ANALYTICS
            // ==================================

            res.json({

                users: {

                    total:
                        totalUsers,

                    admins:
                        totalAdmins,

                    normalUsers:
                        totalNormalUsers

                },

                reviews: {

                    total:
                        totalReviews,

                    averageRating:
                        averageRating === null
                            ? 0
                            : Number(
                                averageRating.toFixed(1)
                            )

                },

                reviewsByGenre:
                    reviewsByGenre,

                reviewsByYear:
                    reviewsByYear

            });


        } catch (error) {

            console.error(
                'Failed to load analytics:',
                error
            );


            res.status(500).json({

                error:
                    'Failed to load analytics'

            });

        }

    }
);

router.get(
  '/test-omdb',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
        const { title, year } = req.query;

        if (!title) {
            return res.status(400).json({
                error: 'Movie title is required'
            });
        }

        const movie = await searchMovie(title, year);

        if (!movie) {
            return res.status(404).json({
                error: 'Movie not found'
            });
        }

        res.json(movie);

    } catch (error) {
        console.error('OMDb test route error:', error);

        res.status(500).json({
            error: 'Failed to fetch movie from OMDb'
        });
    }
});

// DELETE USER - ADMIN ONLY
router.delete(
    '/users/:id',
    authMiddleware,
    adminMiddleware,
    (req, res) => {

        try {

            const userId =
                Number(req.params.id);


            // Prevent admin from deleting themselves
            if (userId === req.user.id) {

                return res.status(400).json({
                    error: 'You cannot delete your own account'
                });

            }


            // Check if user exists
            const existingUser =
                db.prepare(`
                    SELECT id, name, email, role
                    FROM users
                    WHERE id = ?
                `).get(userId);


            if (!existingUser) {

                return res.status(404).json({
                    error: 'User not found'
                });

            }


            // Delete user
            db.prepare(
                'DELETE FROM users WHERE id = ?'
            ).run(userId);


            res.json({
                message: 'User deleted successfully',
                user: existingUser
            });


        } catch (error) {

            console.error(
                'Failed to delete user:',
                error
            );


            res.status(500).json({
                error: 'Failed to delete user'
            });

        }

    }
);

// ==========================================
// CREATE REVIEW FROM OMDb DATA - ADMIN ONLY
// ==========================================

router.post(
    '/reviews',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {

        try {

            const {
                title,
                year,
                rating,
                blurb,
                review,
                verdict,
                icon,
                colors,
                tags,
                critic,
                published
            } = req.body;


            // ======================================
            // CHECK REQUIRED FIELDS
            // ======================================

            if (
                !title ||
                rating === undefined ||
                !blurb ||
                !review ||
                !verdict ||
                !icon ||
                !colors ||
                !tags ||
                !critic ||
                !published
            ) {

                return res.status(400).json({
                    error: 'All review fields are required'
                });

            }


            // ======================================
            // GET MOVIE FROM OMDb
            // ======================================

            const movie = await searchMovie(
                title,
                year
            );


            if (!movie) {

                return res.status(404).json({
                    error: 'Movie not found in OMDb'
                });

            }


            // ======================================
            // CONVERT RUNTIME
            // "148 min" → 148
            // ======================================

            const runtime =
                parseInt(movie.runtime, 10) || 0;


            // ======================================
            // INSERT REVIEW
            // ======================================

            const result = db.prepare(`
                INSERT INTO reviews (
                    user_id,
                    title,
                    year,
                    genre,
                    director,
                    runtime,
                    rating,
                    blurb,
                    review,
                    verdict,
                    icon,
                    colors,
                    tags,
                    critic,
                    published,
                    imdb_id,
                    poster
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(

                req.user.id,

                movie.title,

                Number(movie.year),

                movie.genre || 'Unknown',

                movie.director || 'Unknown',

                runtime,

                Number(rating),

                blurb,

                review,

                verdict,

                icon,

                JSON.stringify(colors),

                JSON.stringify(tags),

                critic,

                String(published),

                movie.imdbId || null,

                movie.poster || null

            );


            // ======================================
            // GET CREATED REVIEW
            // ======================================

            const createdReview = db.prepare(`
                SELECT *
                FROM reviews
                WHERE id = ?
            `).get(result.lastInsertRowid);


            // ======================================
            // SUCCESS
            // ======================================

            res.status(201).json({

                message:
                    'Movie review created successfully',

                review:
                    createdReview

            });


        } catch (error) {

            console.error(
                'Failed to create review:',
                error
            );

            res.status(500).json({
                error: 'Failed to create review'
            });

        }

    }
);

router.post('/update-existing-posters', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT id, title, year, poster
      FROM reviews
      WHERE poster IS NULL OR poster = ''
    `).all();

    let updated = 0;
    let notFound = 0;

    const updatePoster = db.prepare(`
      UPDATE reviews
      SET poster = ?, imdb_id = ?
      WHERE id = ?
    `);

    for (const review of reviews) {
      try {
        const movie = await searchMovie(review.title, review.year);

        if (movie && movie.poster) {
          updatePoster.run(
            movie.poster,
            movie.imdbId || null,
            review.id
          );

          updated++;
        } else {
          notFound++;
        }
      } catch (error) {
        console.log(
          `Could not find poster for: ${review.title} (${review.year})`
        );

        notFound++;
      }
    }

    res.json({
      message: 'Existing movie posters updated',
      totalChecked: reviews.length,
      updated,
      notFound
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Failed to update existing posters'
    });
  }
});

router.post('/replace-placeholder-movies', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const replacements = [
      {
        id: 8,
        title: 'The Batman',
        year: 2022
      },
      {
        id: 6,
        title: 'Encanto',
        year: 2021
      },
      {
        id: 5,
        title: 'The Nun II',
        year: 2023
      },
      {
        id: 4,
        title: 'The Fall Guy',
        year: 2024
      },
      {
        id: 3,
        title: 'The Menu',
        year: 2022
      },
      {
        id: 2,
        title: 'The Creator',
        year: 2023
      },
      {
        id: 1,
        title: 'The Brutalist',
        year: 2024
      }
    ];

    const updateMovie = db.prepare(`
      UPDATE reviews
      SET
        title = ?,
        year = ?,
        genre = ?,
        director = ?,
        runtime = ?,
        imdb_id = ?,
        poster = ?
      WHERE id = ?
    `);

    const results = [];

    for (const replacement of replacements) {

      console.log(
        `Searching OMDb: ${replacement.title} (${replacement.year})`
      );

      const movie = await searchMovie(
        replacement.title,
        replacement.year
      );

      if (!movie) {
        results.push({
          id: replacement.id,
          title: replacement.title,
          status: 'NOT FOUND'
        });

        continue;
      }

      updateMovie.run(
        movie.title || replacement.title,
        Number(movie.year) || replacement.year,
        movie.genre || 'Unknown',
        movie.director || 'Unknown',
        Number(movie.runtime) || 0,
        movie.imdbId || null,
        movie.poster || null,
        replacement.id
      );

      results.push({
        id: replacement.id,
        title: movie.title,
        year: movie.year,
        genre: movie.genre,
        director: movie.director,
        runtime: movie.runtime,
        imdbId: movie.imdbId,
        poster: movie.poster,
        status: 'UPDATED'
      });
    }

    res.json({
      message: 'Placeholder movies replaced successfully',
      results
    });

  } catch (error) {
    console.error('Replace placeholder movies error:', error);

    res.status(500).json({
      error: 'Failed to replace placeholder movies'
    });
  }
});

router.post('/replace-one-movie', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id, title, year } = req.body;

    if (!id || !title || !year) {
      return res.status(400).json({
        error: 'id, title and year are required'
      });
    }

    console.log(`Searching OMDb: ${title} (${year})`);

    const movie = await searchMovie(title, year);

    if (!movie) {
      return res.status(404).json({
        error: 'Movie not found in OMDb',
        title,
        year
      });
    }

    const result = db.prepare(`
      UPDATE reviews
      SET
        title = ?,
        year = ?,
        genre = ?,
        director = ?,
        runtime = ?,
        imdb_id = ?,
        poster = ?
      WHERE id = ?
    `).run(
      movie.title || title,
      Number(movie.year) || Number(year),
      movie.genre || 'Unknown',
      movie.director || 'Unknown',
      Number(movie.runtime) || 0,
      movie.imdbId || null,
      movie.poster || null,
      id
    );

    res.json({
      message: 'Movie updated successfully',
      changes: result.changes,
      movie: {
        id,
        title: movie.title,
        year: movie.year,
        genre: movie.genre,
        director: movie.director,
        runtime: movie.runtime,
        imdbId: movie.imdbId,
        poster: movie.poster
      }
    });

  } catch (error) {
    console.error('Replace one movie error:', error);

    res.status(500).json({
      error: 'Failed to replace movie'
    });
  }
});



module.exports = router;


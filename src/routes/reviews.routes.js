const express = require('express');
const db = require('../db');
const router = express.Router();

const { searchMovie } = require('../service/omdb.service');
const authMiddleware = require('../middleware/auth.middleware');


// ==========================================================
// HELPER
// ==========================================================

function rowToReview(row) {
  if (!row) return null;

  return {
    ...row,

    colors: row.colors
      ? JSON.parse(row.colors)
      : ['#25358b', '#000000'],

    tags: row.tags
      ? JSON.parse(row.tags)
      : []
  };
}


// ==========================================================
// GET ALL REVIEWS
// ==========================================================

router.get('/', (req, res) => {

  try {

    const rows = db.prepare(`
      SELECT *
      FROM reviews
      ORDER BY created_at DESC
    `).all();

    res.json(
      rows.map(rowToReview)
    );

  } catch (error) {

    console.error(
      'Get reviews error:',
      error
    );

    res.status(500).json({
      error: 'Failed to fetch reviews'
    });

  }

});


// ==========================================================
// GET MY REVIEWS
// ==========================================================

router.get(
  '/my',
  authMiddleware,
  (req, res) => {

    try {

      const rows = db.prepare(`
        SELECT *
        FROM reviews
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(req.user.id);

      res.json(
        rows.map(rowToReview)
      );

    } catch (error) {

      console.error(
        'Get my reviews error:',
        error
      );

      res.status(500).json({
        error: 'Failed to fetch your reviews'
      });

    }

  }
);


// ==========================================================
// SEARCH MOVIE FROM OMDb
// AUTHENTICATED USERS CAN USE THIS
// ==========================================================

router.get(
  '/search-movie',
  authMiddleware,
  async (req, res) => {

    try {

      const {
        title,
        year
      } = req.query;


      if (!title || !year) {

        return res.status(400).json({
          error:
            'Movie title and year are required'
        });

      }


      console.log(
        `User movie search: ${title} (${year})`
      );


      const movie =
        await searchMovie(
          title,
          year
        );


      if (!movie) {

        return res.status(404).json({
          error: 'Could not find this movie',
          title,
          year
        });

      }


      res.json(movie);

    } catch (error) {

      console.error(
        'Movie search error:',
        error
      );

      res.status(500).json({
        error: 'Failed to search movie'
      });

    }

  }
);


// ==========================================================
// CREATE REVIEW
// NORMAL USERS + ADMINS
// ==========================================================

router.post(
  '/',
  authMiddleware,
  (req, res) => {

    try {

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
        published,
        imdb_id,
        poster
      } = req.body;


      // ----------------------------------------------------
      // VALIDATION
      // ----------------------------------------------------

      if (
        !title ||
        !year ||
        rating === undefined
      ) {

        return res.status(400).json({
          error:
            'Title, year and rating are required'
        });

      }


      // ----------------------------------------------------
      // INSERT
      // ----------------------------------------------------

      const result =
        db.prepare(`
          INSERT INTO reviews (
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
            user_id,
            imdb_id,
            poster
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(

          title,

          Number(year),

          genre ||
            'Unknown',

          director ||
            'Unknown',

          Number(runtime) ||
            0,

          Number(rating),

          blurb ||
            '',

          review ||
            '',

          verdict ||
            '',

          icon ||
            'wave',

          JSON.stringify(
            colors ||
            ['#25358b', '#000000']
          ),

          JSON.stringify(
            tags ||
            []
          ),

          critic ||
            'Reelmark',

          published === false
            ? 'false'
            : 'true',

          req.user.id,

          imdb_id ||
            null,

          poster ||
            null

        );


      // ----------------------------------------------------
      // GET CREATED REVIEW
      // ----------------------------------------------------

      const createdReview =
        db.prepare(`
          SELECT *
          FROM reviews
          WHERE id = ?
        `).get(
          result.lastInsertRowid
        );


      res.status(201).json({

        message:
          'Review created successfully',

        review:
          rowToReview(createdReview)

      });

    } catch (error) {

      console.error(
        '================================'
      );

      console.error(
        'CREATE REVIEW ERROR:'
      );

      console.error(error);

      console.error(
        'ERROR MESSAGE:',
        error.message
      );

      console.error(
        'ERROR STACK:',
        error.stack
      );

      console.error(
        '================================'
      );


      res.status(500).json({

        error:
          'Failed to create review',

        details:
          error.message

      });

    }

  }
);


// ==========================================================
// DELETE REVIEW
// ==========================================================

router.delete(
  '/:id',
  authMiddleware,
  (req, res) => {

    try {

      const id =
        Number(req.params.id);


      const review =
        db.prepare(`
          SELECT *
          FROM reviews
          WHERE id = ?
        `).get(id);


      if (!review) {

        return res.status(404).json({
          error: 'Review not found'
        });

      }


      // User can delete only their own review
      // Admin can delete any review

      if (
        req.user.role !== 'admin' &&
        review.user_id !== req.user.id
      ) {

        return res.status(403).json({
          error:
            'You can only delete your own reviews'
        });

      }


      db.prepare(`
        DELETE FROM reviews
        WHERE id = ?
      `).run(id);


      res.json({
        message:
          'Review deleted successfully'
      });

    } catch (error) {

      console.error(
        'Delete review error:',
        error
      );

      res.status(500).json({
        error:
          'Failed to delete review'
      });

    }

  }
);


// ==========================================================
// UPDATE REVIEW
// ==========================================================

router.put(
  '/:id',
  authMiddleware,
  (req, res) => {

    try {

      const id =
        Number(req.params.id);


      const existing =
        db.prepare(`
          SELECT *
          FROM reviews
          WHERE id = ?
        `).get(id);


      if (!existing) {

        return res.status(404).json({
          error: 'Review not found'
        });

      }


      // ----------------------------------------------------
      // OWNERSHIP CHECK
      // ----------------------------------------------------

      if (
        req.user.role !== 'admin' &&
        existing.user_id !== req.user.id
      ) {

        return res.status(403).json({
          error:
            'You can only edit your own review'
        });

      }


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
        published,
        imdb_id,
        poster
      } = req.body;


      // ----------------------------------------------------
      // UPDATE
      // ----------------------------------------------------

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
          published = ?,
          imdb_id = ?,
          poster = ?
        WHERE id = ?
      `).run(

        title ||
          existing.title,

        Number(year) ||
          existing.year,

        genre ||
          existing.genre,

        director ||
          existing.director,

        Number(runtime) ||
          existing.runtime,

        Number(rating),

        blurb ||
          existing.blurb,

        review ||
          existing.review,

        verdict ||
          existing.verdict,

        icon ||
          existing.icon,

        JSON.stringify(
          colors ||
          JSON.parse(existing.colors || '[]')
        ),

        JSON.stringify(
          tags ||
          JSON.parse(existing.tags || '[]')
        ),

        critic ||
          existing.critic,

        published === false
          ? 'false'
          : 'true',

        imdb_id ||
          existing.imdb_id ||
          null,

        poster ||
          existing.poster ||
          null,

        id

      );


      // ----------------------------------------------------
      // RETURN UPDATED REVIEW
      // ----------------------------------------------------

      const updatedReview =
        db.prepare(`
          SELECT *
          FROM reviews
          WHERE id = ?
        `).get(id);


      res.json({

        message:
          'Review updated successfully',

        review:
          rowToReview(updatedReview)

      });

    } catch (error) {

      console.error(
        'Update review error:',
        error
      );

      res.status(500).json({

        error:
          'Failed to update review',

        details:
          error.message

      });

    }

  }
);


// ==========================================================
// GET SINGLE REVIEW
// IMPORTANT: KEEP THIS AFTER /search-movie
// ==========================================================

router.get(
  '/:id',
  (req, res) => {

    try {

      const id =
        Number(req.params.id);


      const row =
        db.prepare(`
          SELECT *
          FROM reviews
          WHERE id = ?
        `).get(id);


      if (!row) {

        return res.status(404).json({
          error:
            'Review not found'
        });

      }


      res.json(
        rowToReview(row)
      );

    } catch (error) {

      console.error(
        'Get single review error:',
        error
      );

      res.status(500).json({
        error:
          'Failed to fetch review'
      });

    }

  }
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;
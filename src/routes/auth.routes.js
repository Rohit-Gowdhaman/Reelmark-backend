const express = require('express');

const {
    register ,
    login
} = require('../controllers/auth.controllers');

const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login' , login);

router.get('/profile', authMiddleware, (req, res) => {
    res.status(200).json({
        message: 'You accessed a protected route',
        user: req.user
    });
});

module.exports = router;
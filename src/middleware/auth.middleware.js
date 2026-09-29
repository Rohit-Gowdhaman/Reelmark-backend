const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        // Get Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: 'Access denied. No token provided'
            });
        }

        // Check Bearer token
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Access denied. Invalid token format'
            });
        }

        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Store user information in request
        req.user = decoded;

        // Continue to the next function
        next();

    } catch (error) {
        return res.status(401).json({
            error: 'Invalid or expired token'
        });
    }
};

module.exports = authMiddleware;
const db = require('../db');

const adminMiddleware = (req, res, next) => {

    // Check if user is logged in
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required'
        });
    }

    try {

        // Get the user's current role from the database
        const user = db.prepare(`
            SELECT id, role
            FROM users
            WHERE id = ?
        `).get(req.user.id);

        // User no longer exists
        if (!user) {
            return res.status(401).json({
                error: 'User account not found'
            });
        }

        // Check the CURRENT database role
        if (user.role !== 'admin') {
            return res.status(403).json({
                error: 'Admin access required'
            });
        }

        // User is currently an admin
        next();

    } catch (error) {

        console.error(
            'Admin authorization error:',
            error
        );

        return res.status(500).json({
            error: 'Authorization check failed'
        });
    }
};

module.exports = adminMiddleware;
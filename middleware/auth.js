function requireLoginPage(req, res, next) {
    if (!req.session.user) return res.redirect("/connexion");
    next();
}

function requireLoginApi(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: "Authentication required" });
    }
    next();
}

module.exports = { requireLoginPage, requireLoginApi };

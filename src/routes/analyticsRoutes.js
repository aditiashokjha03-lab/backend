const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const supabase = require('../config/supabase');

const analyticsService = require('../services/analyticsService');

const router = express.Router();
router.use(authenticateUser);

router.get('/summary', async (req, res, next) => {
    try {
        const summary = await analyticsService.getSummary(req.user.id);
        res.json(summary);
    } catch (err) { next(err); }
});

router.get('/heatmap', async (req, res, next) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
        const heatmap = await analyticsService.getHeatmap(req.user.id, year);
        res.json(heatmap);
    } catch (err) { next(err); }
});

router.get('/trend', async (req, res, next) => {
    try {
        const days = req.query.days ? parseInt(req.query.days) : 7;
        const trend = await analyticsService.getTrend(req.user.id, days);
        res.json(trend);
    } catch (err) { next(err); }
});

module.exports = router;

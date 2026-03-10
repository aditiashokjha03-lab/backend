const express = require('express');
const { z } = require('zod');
const { getLogsByDate, upsertLog } = require('../models/logModel');
const { authenticateUser } = require('../middleware/auth');
const { checkStreakAchievements, checkFlawlessAchievement, checkAiHabitAchievements } = require('../services/achievementService');

const router = express.Router();
router.use(authenticateUser);

const logSchema = z.object({
    habit_id: z.string().uuid(),
    log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
    completed: z.boolean(),
    completion_value: z.number().optional(),
    notes: z.string().optional(),
    mood: z.string().optional()
});

router.get('/', async (req, res, next) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'Date query param required' });
        const logs = await getLogsByDate(req.user.id, date);
        res.json(logs);
    } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
    try {
        const validated = logSchema.parse(req.body);
        const result = await upsertLog(req.user.id, validated.habit_id, validated);

        // Trigger achievement checks
        checkStreakAchievements(req.user.id).catch(console.error);
        checkFlawlessAchievement(req.user.id).catch(console.error);
        checkAiHabitAchievements(req.user.id).catch(console.error);

        res.json(result);
    } catch (error) { next(error); }
});

module.exports = router;

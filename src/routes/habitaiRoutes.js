const express = require('express');
const { z } = require('zod');
const { suggestHabits } = require('../services/aiService');
const fallbackHabits = require('../data/fallbackHabits.json');
const supabase = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const { checkAiHabitAchievements } = require('../services/achievementService');
const rateLimit = require('express-rate-limit');

const router = express.Router();
router.use(authenticateUser);

const suggestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour per user
    keyGenerator: (req) => req.user.id,
    message: 'Too many requests from this IP, please try again after an hour'
});

const suggestSchema = z.object({
    goal_category: z.string(),
    goal_description: z.string().max(200)
});

router.post('/suggest', suggestLimiter, async (req, res, next) => {
    try {
        const validated = suggestSchema.parse(req.body);
        let suggestions;

        try {
            suggestions = await suggestHabits(validated.goal_category, validated.goal_description);
        } catch (aiError) {
            // Fallback
            const category = Object.keys(fallbackHabits).find(k => k.toLowerCase() === validated.goal_category.toLowerCase());
            suggestions = category ? fallbackHabits[category] : fallbackHabits['Productivity'];
        }

        // Save session
        const { data: sessionData, error } = await supabase
            .from('habitai_sessions')
            .insert([{
                user_id: req.user.id,
                goal_category: validated.goal_category,
                goal_description: validated.goal_description,
                suggestions
            }])
            .select('id')
            .single();

        if (error) console.error("Failed to save habitai session:", error);

        res.json({ session_id: sessionData?.id, suggestions });
    } catch (err) { next(err); }
});

router.get('/history', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('habitai_sessions')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
});

router.post('/track-addition', async (req, res, next) => {
    try {
        const { session_id, habit_id } = req.body;
        if (!session_id || !habit_id) return res.status(400).json({ error: 'session_id and habit_id required' });

        const { data: session, error: fetchError } = await supabase
            .from('habitai_sessions')
            .select('habits_added')
            .eq('id', session_id)
            .single();

        if (fetchError) throw fetchError;

        const updatedHabits = [...(session.habits_added || []), habit_id];

        const { error: updateError } = await supabase
            .from('habitai_sessions')
            .update({ habits_added: updatedHabits })
            .eq('id', session_id);

        if (updateError) throw updateError;

        // Trigger achievement check
        checkAiHabitAchievements(req.user.id).catch(console.error);

        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;

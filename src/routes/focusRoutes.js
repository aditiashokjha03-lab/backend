const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { z } = require('zod');
const { checkFocusAchievements } = require('../services/achievementService');

const router = express.Router();
router.use(authenticateUser);

const startSchema = z.object({
    habit_id: z.string().uuid().optional(),
    duration_minutes: z.number().min(1).max(120),
    tick_enabled: z.boolean().default(true),
    volume: z.number().min(0).max(1).default(0.5)
});

router.post('/start', async (req, res, next) => {
    try {
        const validated = startSchema.parse(req.body);
        const { data, error } = await supabase
            .from('focus_sessions')
            .insert([{ ...validated, user_id: req.user.id }])
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
});

router.post('/end/:id', async (req, res, next) => {
    try {
        const { completed } = req.body;
        const { data: session, error: sessErr } = await supabase
            .from('focus_sessions')
            .update({ completed })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (sessErr) throw sessErr;

        // Optional: Add XP for completion
        let xp_awarded = 0;
        if (completed) {
            xp_awarded = 5;
            checkFocusAchievements(req.user.id).catch(console.error);
        }

        res.json({ session, xp_awarded });
    } catch (err) { next(err); }
});

router.get('/history', async (req, res, next) => {
    try {
        const { data: history, error } = await supabase
            .from('focus_sessions')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) throw error;
        res.json(history);
    } catch (err) { next(err); }
});

module.exports = router;

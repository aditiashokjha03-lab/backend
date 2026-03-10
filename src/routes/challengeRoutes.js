const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { checkChallengeAchievements } = require('../services/achievementService');

const router = express.Router();
router.use(authenticateUser);

router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
    try {
        const { title, description, start_date, end_date, habit_template } = req.body;
        const { data, error } = await supabase
            .from('challenges')
            .insert([{
                creator_id: req.user.id,
                title,
                description,
                start_date,
                end_date,
                habit_template
            }])
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
});

router.post('/:id/join', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('challenge_members')
            .insert([{ challenge_id: req.params.id, user_id: req.user.id }])
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
});

router.delete('/:id/leave', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('challenge_members')
            .delete()
            .eq('challenge_id', req.params.id)
            .eq('user_id', req.user.id);
        if (error) throw error;
        res.json({ message: 'Successfully left the challenge' });
    } catch (err) { next(err); }
});

router.get('/:id/leaderboard', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('challenge_members')
            .select('*, profiles(username, avatar_url)')
            .eq('challenge_id', req.params.id)
            .order('progress_score', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
});

module.exports = router;

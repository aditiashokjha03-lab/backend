const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const supabase = require('../config/supabase');

const router = express.Router();
router.use(authenticateUser);

router.get('/', async (req, res, next) => {
    try {
        const { data: achievements, error: achError } = await supabase.from('achievements').select('*');
        if (achError) throw achError;

        const { data: userAch, error: uaError } = await supabase.from('user_achievements').select('*').eq('user_id', req.user.id);
        if (uaError) throw uaError;

        // merge earned status
        const earnedMap = new Map(userAch.map(u => [u.achievement_id, u.earned_at]));
        const merged = achievements.map(a => ({
            ...a,
            earned: earnedMap.has(a.id),
            unlocked_at: earnedMap.get(a.id),
            icon_url: a.icon, // map icon to icon_url for frontend
            progress: { current: earnedMap.has(a.id) ? 1 : 0, target: 1 }
        }));

        res.json(merged);
    } catch (err) { next(err); }
});

module.exports = router;

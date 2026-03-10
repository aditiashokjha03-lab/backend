const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const supabase = require('../config/supabase');
const multer = require('multer');

const router = express.Router();

// check username logic (no auth required)
router.get('/check-username', async (req, res, next) => {
    try {
        const { username } = req.query;
        if (!username) return res.json({ available: false });
        const { data } = await supabase.from('profiles').select('id').eq('username', username).single();
        res.json({ available: !data });
    } catch (err) {
        if (err.code === 'PGRST116') { // not found
            return res.json({ available: true });
        }
        next(err);
    }
});

router.use(authenticateUser);

router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
});

router.put('/', async (req, res, next) => {
    try {
        const { username, bio, avatar_url, timezone } = req.body;
        const { data, error } = await supabase
            .from('profiles')
            .update({ username, bio, avatar_url, timezone })
            .eq('id', req.user.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
});

// Configure multer (memory storage for now)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/avatar', upload.single('avatar'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${req.user.id}-${Date.now()}.${fileExt}`;

        // Upload to Supabase Storage 'avatars'
        const { error: uploadErr } = await supabase.storage
            .from('avatars')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

        res.json({ url: publicUrl });
    } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const { z } = require('zod');
const { getHabits, getHabitById, createHabit, updateHabit, archiveHabit } = require('../models/habitModel');
const { authenticateUser } = require('../middleware/auth');
const { checkHabitAchievements } = require('../services/achievementService');

const router = express.Router();

router.use(authenticateUser);

const habitSchema = z.object({
    name: z.string().min(1).max(50),
    icon: z.string().optional(),
    color: z.string().optional(),
    frequency: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
    category: z.string(),
    goal_type: z.string().optional(),
    goal_value: z.number().optional(),
});

router.get('/', async (req, res, next) => {
    try {
        const habits = await getHabits(req.user.id);
        res.json(habits);
    } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
    try {
        const validated = habitSchema.parse(req.body);
        const newHabit = await createHabit({ ...validated, user_id: req.user.id });
        // Trigger achievement check
        checkHabitAchievements(req.user.id).catch(console.error);
        res.status(201).json(newHabit);
    } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
    try {
        const validated = habitSchema.partial().parse(req.body);
        const updated = await updateHabit(req.params.id, req.user.id, validated);
        res.json(updated);
    } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const archived = await archiveHabit(req.params.id, req.user.id);
        res.json({ message: 'Habit archived', habit: archived });
    } catch (error) { next(error); }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const goalModel = require('../models/goalModel');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

router.get('/', async (req, res, next) => {
    try {
        const goals = await goalModel.getGoals(req.user.id);
        res.json(goals);
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const goal = await goalModel.createGoal({
            ...req.body,
            user_id: req.user.id
        });
        res.status(201).json(goal);
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const goal = await goalModel.updateGoal(req.params.id, req.user.id, req.body);
        res.json(goal);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        await goalModel.deleteGoal(req.params.id, req.user.id);
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

module.exports = router;

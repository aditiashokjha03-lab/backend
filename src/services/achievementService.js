const supabase = require('../config/supabase');

/**
 * Achievement Service
 * Handles checking and unlocking of badges based on user activity.
 */

const BADGE_KEYS = {
    AI_EXPLORER: 'habitai_first',
    AI_BELIEVER: 'habitai_streak_7',
    FULL_BUY_IN: 'habitai_all_added',
    JOURNEY_BEGINS: 'first_habit',
    ON_FIRE: 'streak_3',
    UNSTOPPABLE: 'streak_7',
    DEDICATED: 'streak_30',
    MULTITASKER: 'habits_5',
    FLAWLESS: 'perfect_week',
    DEEP_WORKER: 'focus_10_sessions',
    CHAMPION: 'challenge_winner'
};

/**
 * Unlocks a badge for a user if not already unlocked.
 */
async function unlockBadge(userId, badgeKey) {
    try {
        // Get achievement ID from key
        const { data: achievement, error: achError } = await supabase
            .from('achievements')
            .select('id, xp_reward')
            .eq('key', badgeKey)
            .single();

        if (achError || !achievement) {
            console.error(`Achievement not found for key: ${badgeKey}`, achError);
            return;
        }

        // Check if already earned
        const { data: existing, error: checkError } = await supabase
            .from('user_achievements')
            .select('id')
            .eq('user_id', userId)
            .eq('achievement_id', achievement.id)
            .maybeSingle();

        if (checkError) throw checkError;
        if (existing) return;

        // Unlock!
        const { error: unlockError } = await supabase
            .from('user_achievements')
            .insert({
                user_id: userId,
                achievement_id: achievement.id
            });

        if (unlockError) throw unlockError;

        // Award XP
        if (achievement.xp_reward > 0) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('xp, level')
                .eq('id', userId)
                .single();

            if (profile) {
                let newXp = (profile.xp || 0) + achievement.xp_reward;
                let newLevel = profile.level || 1;

                // Simple level up logic: 1000 XP per level
                while (newXp >= 1000) {
                    newXp -= 1000;
                    newLevel += 1;
                }

                await supabase
                    .from('profiles')
                    .update({ xp: newXp, level: newLevel })
                    .eq('id', userId);
            }
        }

        console.log(`Badge Unlocked: ${badgeKey} for user ${userId}`);
    } catch (error) {
        console.error(`Error unlocking badge ${badgeKey}:`, error);
    }
}

/**
 * Checks habit-related achievements.
 * Triggered on habit creation.
 */
async function checkHabitAchievements(userId) {
    // 1. "The Journey Begins" - First habit
    const { count: habitCount } = await supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (habitCount >= 1) {
        await unlockBadge(userId, BADGE_KEYS.JOURNEY_BEGINS);
    }

    // 2. "Multitasker" - 5 active habits
    const { count: activeCount } = await supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('archived', false);

    if (activeCount >= 5) {
        await unlockBadge(userId, BADGE_KEYS.MULTITASKER);
    }
}

/**
 * Checks AI Explorer and Full Buy-In achievements.
 * Triggered when AI suggestions are added.
 */
async function checkAiHabitAchievements(userId) {
    // We can check if any habit has metadata or name matching AI suggestions
    // However, the habitai_sessions table tracks habits_added UUIDs.

    const { data: sessions } = await supabase
        .from('habitai_sessions')
        .select('habits_added, suggestions')
        .eq('user_id', userId);

    if (!sessions) return;

    let totalAdded = 0;
    let anySessionWithAllAdded = false;

    sessions.forEach(session => {
        const added = session.habits_added || [];
        totalAdded += added.length;

        // suggestions is usually an array of 3
        if (added.length >= 3) {
            anySessionWithAllAdded = true;
        }
    });

    if (totalAdded > 0) {
        await unlockBadge(userId, BADGE_KEYS.AI_EXPLORER);
    }

    if (anySessionWithAllAdded) {
        await unlockBadge(userId, BADGE_KEYS.FULL_BUY_IN);
    }
}

/**
 * Checks streak-based achievements.
 * Triggered on habit completion log.
 */
async function checkStreakAchievements(userId) {
    const { data: streaks } = await supabase
        .from('streaks')
        .select('current_streak, habit_id')
        .eq('user_id', userId);

    if (!streaks) return;

    let maxStreak = 0;
    streaks.forEach(s => {
        if (s.current_streak > maxStreak) maxStreak = s.current_streak;
    });

    if (maxStreak >= 3) await unlockBadge(userId, BADGE_KEYS.ON_FIRE);
    if (maxStreak >= 7) await unlockBadge(userId, BADGE_KEYS.UNSTOPPABLE);
    if (maxStreak >= 30) await unlockBadge(userId, BADGE_KEYS.DEDICATED);

    // AI Believer - 7 day streak on an AI habit
    // We need to identify which habits are AI habits.
    // Let's check habits_added in habitai_sessions.
    const { data: aiSessions } = await supabase
        .from('habitai_sessions')
        .select('habits_added')
        .eq('user_id', userId);

    const aiHabitIds = new Set();
    aiSessions?.forEach(s => s.habits_added?.forEach(id => aiHabitIds.add(id)));

    for (const s of streaks) {
        if (aiHabitIds.has(s.habit_id) && s.current_streak >= 7) {
            await unlockBadge(userId, BADGE_KEYS.AI_BELIEVER);
            break;
        }
    }
}

/**
 * Checks focus-related achievements.
 * Triggered on focus session completion.
 */
async function checkFocusAchievements(userId) {
    const { count: focusSessionsCount } = await supabase
        .from('focus_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', true);

    if (focusSessionsCount >= 10) {
        await unlockBadge(userId, BADGE_KEYS.DEEP_WORKER);
    }
}

/**
 * Checks "Flawless" achievement - complete all active habits for 7 consecutive days.
 * This is expensive to check every log, but we'll do it.
 */
async function checkFlawlessAchievement(userId) {
    const { data: activeHabits } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('archived', false);

    if (!activeHabits || activeHabits.length === 0) return;

    const habitIds = activeHabits.map(h => h.id);

    // Check last 7 days including today
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }

    const { data: logs } = await supabase
        .from('habit_logs')
        .select('habit_id, log_date, completed')
        .eq('user_id', userId)
        .in('habit_id', habitIds)
        .in('log_date', dates);

    if (!logs) return;

    // Check for each date if ALL habits were completed
    for (const date of dates) {
        const logsForDate = logs.filter(l => l.log_date === date);
        const completedCount = logsForDate.filter(l => l.completed).length;

        if (completedCount < habitIds.length) {
            // Missed a habit on this day
            return;
        }
    }

    // If we reached here, 7 days are complete!
    await unlockBadge(userId, BADGE_KEYS.FLAWLESS);
}

/**
 * Checks challenge achievements.
 * Triggered when a challenge ends or user wins.
 */
async function checkChallengeAchievements(userId) {
    // Win a group challenge (placeholder logic as challenge winners aren't explicitly marked yet)
    // We'll check if user has highest score in any challenge they finished.

    const { data: memberships } = await supabase
        .from('challenge_members')
        .select('challenge_id, progress_score')
        .eq('user_id', userId);

    if (!memberships) return;

    for (const m of memberships) {
        const { data: allMembers } = await supabase
            .from('challenge_members')
            .select('progress_score')
            .eq('challenge_id', m.challenge_id)
            .order('progress_score', { ascending: false });

        if (allMembers && allMembers[0].progress_score === m.progress_score && allMembers[0].progress_score > 0) {
            // Assume they won if they are #1
            await unlockBadge(userId, BADGE_KEYS.CHAMPION);
            break;
        }
    }
}

module.exports = {
    checkHabitAchievements,
    checkAiHabitAchievements,
    checkStreakAchievements,
    checkFocusAchievements,
    checkFlawlessAchievement,
    checkChallengeAchievements
};

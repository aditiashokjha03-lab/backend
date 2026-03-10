const supabase = require('../config/supabase');

const getLogsByDate = async (userId, date) => {
    const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', date);
    if (error) throw error;
    return data;
};

const upsertLog = async (userId, habitId, logData) => {
    // 1. Fetch habit and existing log to determine if we should award rewards
    const [{ data: habit }, { data: existingLog }] = await Promise.all([
        supabase.from('habits').select('difficulty').eq('id', habitId).single(),
        supabase.from('habit_logs').select('completed').eq('habit_id', habitId).eq('log_date', logData.log_date).maybeSingle()
    ]);

    if (!habit) throw new Error('Habit not found');

    // 2. Upsert Log
    const { data: log, error: logError } = await supabase
        .from('habit_logs')
        .upsert({
            user_id: userId,
            habit_id: habitId,
            log_date: logData.log_date,
            completed: logData.completed,
            completion_value: logData.completion_value,
            notes: logData.notes,
            mood: logData.mood
        }, { onConflict: 'habit_id, log_date' })
        .select()
        .single();

    if (logError) throw logError;

    let xpEarned = 0;
    let newStreak = null;

    // 3. Award XP and update Streaks ONLY IF this is a new completion
    if (logData.completed && (!existingLog || !existingLog.completed)) {
        // XP Calculation based on difficulty
        const difficultyMultipliers = {
            easy: 10,
            medium: 20,
            hard: 30,
            expert: 50
        };
        xpEarned = difficultyMultipliers[habit.difficulty.toLowerCase()] || 10;

        // Streak Tracking
        const todayStr = logData.log_date;
        const todayDate = new Date(todayStr);
        const yesterdayDate = new Date(todayDate);
        yesterdayDate.setDate(todayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        // Fetch existing streak record
        const { data: streakRecord } = await supabase
            .from('streaks')
            .select('*')
            .eq('habit_id', habitId)
            .maybeSingle();

        let currentStreak = 1;
        let longestStreak = 1;

        if (streakRecord) {
            if (streakRecord.last_completed === yesterdayStr) {
                currentStreak = (streakRecord.current_streak || 0) + 1;
            } else if (streakRecord.last_completed === todayStr) {
                currentStreak = streakRecord.current_streak; // Already completed today
            } else {
                currentStreak = 1; // Gap in days, reset streak
            }
            longestStreak = Math.max(currentStreak, streakRecord.longest_streak || 0);

            const { data: updatedStreak } = await supabase
                .from('streaks')
                .update({
                    current_streak: currentStreak,
                    longest_streak: longestStreak,
                    last_completed: todayStr,
                    updated_at: new Date().toISOString()
                })
                .eq('id', streakRecord.id)
                .select()
                .single();
            newStreak = updatedStreak;
        } else {
            const { data: insertedStreak } = await supabase
                .from('streaks')
                .insert({
                    habit_id: habitId,
                    user_id: userId,
                    current_streak: 1,
                    longest_streak: 1,
                    last_completed: todayStr
                })
                .select()
                .single();
            newStreak = insertedStreak;
        }

        // 4. Update Profile XP & Level
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profile) {
            let newXp = (profile.xp || 0) + xpEarned;
            let newLevel = profile.level || 1;

            // Level up logic: next_level_threshold = current_level * 100
            while (newXp >= (newLevel * 100)) {
                newXp -= (newLevel * 100);
                newLevel += 1;
            }

            await supabase
                .from('profiles')
                .update({ xp: newXp, level: newLevel })
                .eq('id', userId);
        }
    }

    return { log, streak: newStreak, xp_earned: xpEarned };
};

module.exports = { getLogsByDate, upsertLog };

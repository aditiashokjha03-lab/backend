const supabase = require('../config/supabase');

/**
 * Analytics Service
 * Provides insights into user performance, habits, and streaks.
 */

async function getSummary(userId) {
    try {
        const { count: totalHabits } = await supabase
            .from('habits')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('archived', false);

        const { data: profile } = await supabase
            .from('profiles')
            .select('xp, level')
            .eq('id', userId)
            .single();

        const { data: streaks } = await supabase
            .from('streaks')
            .select('longest_streak')
            .eq('user_id', userId);

        const bestStreak = streaks ? Math.max(0, ...streaks.map(s => s.longest_streak || 0)) : 0;

        // Calculate completion rate for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateLimit = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: logs } = await supabase
            .from('habit_logs')
            .select('completed')
            .eq('user_id', userId)
            .gte('log_date', dateLimit);

        let completionRate = 0;
        if (logs && logs.length > 0) {
            const completed = logs.filter(l => l.completed).length;
            completionRate = Math.round((completed / logs.length) * 100);
        }

        return {
            total_habits: totalHabits || 0,
            completion_rate: completionRate,
            best_streak: bestStreak,
            total_xp: profile?.xp || 0,
            level: profile?.level || 1
        };
    } catch (error) {
        console.error('Error in getSummary analytics:', error);
        throw error;
    }
}

async function getTrend(userId, days = 7) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (days - 1)); // Include today
        const dateLimit = startDate.toISOString().split('T')[0];

        const { data: logs } = await supabase
            .from('habit_logs')
            .select('log_date, completed')
            .eq('user_id', userId)
            .gte('log_date', dateLimit)
            .eq('completed', true);

        // Group by date
        const counts = {};
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const ds = d.toISOString().split('T')[0];
            counts[ds] = 0;
        }

        logs?.forEach(log => {
            if (counts[log.log_date] !== undefined) {
                counts[log.log_date]++;
            }
        });

        return Object.entries(counts).map(([date, count]) => ({ date, count }));
    } catch (error) {
        console.error('Error in getTrend analytics:', error);
        throw error;
    }
}

async function getHeatmap(userId, year = new Date().getFullYear()) {
    try {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const { data: logs } = await supabase
            .from('habit_logs')
            .select('log_date, completed')
            .eq('user_id', userId)
            .gte('log_date', startDate)
            .lte('log_date', endDate)
            .eq('completed', true);

        // Since heatmap can be many points, we just return the days with activity
        // The frontend can handle the gaps or we can fill them
        const dayCounts = {};
        logs?.forEach(log => {
            dayCounts[log.log_date] = (dayCounts[log.log_date] || 0) + 1;
        });

        return Object.entries(dayCounts).map(([date, count]) => ({ date, count }));
    } catch (error) {
        console.error('Error in getHeatmap analytics:', error);
        throw error;
    }
}

module.exports = {
    getSummary,
    getTrend,
    getHeatmap
};

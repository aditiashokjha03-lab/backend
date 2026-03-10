const supabase = require('../config/supabase');

const getHabits = async (userId) => {
    const { data, error } = await supabase
        .from('habits')
        .select('*, streaks(current_streak, longest_streak)')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
    if (error) throw error;

    // Flatten the streaks data for easier frontend consumption
    return data.map(h => ({
        ...h,
        current_streak: h.streaks?.current_streak || 0,
        longest_streak: h.streaks?.longest_streak || 0
    }));
};

const getHabitById = async (id, userId) => {
    const { data, error } = await supabase
        .from('habits')
        .select('*, streaks(current_streak, longest_streak)')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
    if (error) throw error;

    return {
        ...data,
        current_streak: data.streaks?.current_streak || 0,
        longest_streak: data.streaks?.longest_streak || 0
    };
};

const createHabit = async (habitData) => {
    const { data, error } = await supabase
        .from('habits')
        .insert([habitData])
        .select()
        .single();
    if (error) throw error;
    return data;
};

const updateHabit = async (id, userId, updates) => {
    const { data, error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

const archiveHabit = async (id, userId) => {
    const { data, error } = await supabase
        .from('habits')
        .update({ archived: true })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

module.exports = { getHabits, getHabitById, createHabit, updateHabit, archiveHabit };

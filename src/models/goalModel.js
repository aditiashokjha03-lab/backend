const supabase = require('../config/supabase');

const getGoals = async (userId) => {
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

const createGoal = async (goalData) => {
    const { data, error } = await supabase
        .from('goals')
        .insert([goalData])
        .select()
        .single();
    if (error) throw error;
    return data;
};

const updateGoal = async (id, userId, updates) => {
    const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

const deleteGoal = async (id, userId) => {
    const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error) throw error;
    return true;
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal };

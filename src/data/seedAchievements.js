require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const achievements = [
    {
        key: 'habitai_first',
        name: 'AI Explorer',
        description: 'Add your first AI habit',
        icon: '🤖',
        xp_reward: 50
    },
    {
        key: 'habitai_streak_7',
        name: 'AI Believer',
        description: 'Keep an AI habit for 7 days',
        icon: '🦾',
        xp_reward: 150
    },
    {
        key: 'habitai_all_added',
        name: 'Full Buy-In',
        description: 'Add all 3 AI suggestions',
        icon: '✨',
        xp_reward: 100
    },
    {
        key: 'first_habit',
        name: 'The Journey Begins',
        description: 'Create your first habit',
        icon: '🌱',
        xp_reward: 50
    },
    {
        key: 'streak_3',
        name: 'On Fire',
        description: 'Hit a 3-day streak',
        icon: '🔥',
        xp_reward: 50
    },
    {
        key: 'streak_7',
        name: 'Unstoppable',
        description: 'Hit a 7-day streak',
        icon: '🚀',
        xp_reward: 150
    },
    {
        key: 'streak_30',
        name: 'Dedicated',
        description: 'Hit a 30-day streak',
        icon: '💎',
        xp_reward: 500
    },
    {
        key: 'habits_5',
        name: 'Multitasker',
        description: 'Maintain 5 active habits',
        icon: '🤹',
        xp_reward: 200
    },
    {
        key: 'perfect_week',
        name: 'Flawless',
        description: 'Complete all habits for a week',
        icon: '⭐',
        xp_reward: 300
    },
    {
        key: 'focus_10_sessions',
        name: 'Deep Worker',
        description: 'Complete 10 focus sessions',
        icon: '🧠',
        xp_reward: 200
    },
    {
        key: 'challenge_winner',
        name: 'Champion',
        description: 'Win a group challenge',
        icon: '🏆',
        xp_reward: 500
    }
];

async function seed() {
    console.log('Seeding achievements...');
    
    // UPSERT doesn't work out of the box without uniquely constrained columns in the standard Supabase payload unless specified.
    // Instead, we will fetch existing, and map.
    const { data: existing, error: fetchErr } = await supabase.from('achievements').select('key, id');
    if (fetchErr) {
        console.error('Error fetching existing:', fetchErr);
        return;
    }

    const existingMap = new Map();
    existing?.forEach(a => existingMap.set(a.key, a.id));

    for (const ach of achievements) {
        if (existingMap.has(ach.key)) {
            console.log(`Updating existing achievement: ${ach.key}`);
            const { error: updateErr } = await supabase
                .from('achievements')
                .update({ 
                    name: ach.name, 
                    description: ach.description, 
                    icon: ach.icon, 
                    xp_reward: ach.xp_reward 
                })
                .eq('key', ach.key);
                
            if (updateErr) console.error(`Error updating ${ach.key}:`, updateErr);
        } else {
            console.log(`Inserting new achievement: ${ach.key}`);
            const { error: insertErr } = await supabase
                .from('achievements')
                .insert([ach]);
                
            if (insertErr) console.error(`Error inserting ${ach.key}:`, insertErr);
        }
    }
    
    console.log('Done seeding achievements.');
}

seed();

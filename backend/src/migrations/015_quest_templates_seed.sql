-- Quest Templates Seed Data
-- Diverse templates for fallback quest generation and tutorial quests

-- Clear existing templates (safe to re-run)
TRUNCATE quest_templates CASCADE;

-- ============================================
-- STRENGTH (STR) FOCUSED QUESTS
-- ============================================

INSERT INTO quest_templates (template_name, title, description, quest_type, difficulty, npc_involved, theme, estimated_duration, objectives) VALUES
('str_iron_forge', 'The Iron Forge Challenge',
 'Master Thornwick needs your help at the forge. Heavy metalwork awaits those with strong arms.',
 'side', 'medium', 'Master Thornwick', 'crafting', '2-3 days',
 '[{"narrativeDescription": "Help Master Thornwick shape the enchanted ore at his forge", "mechanicalDescription": "Complete a strength training session", "goalMapping": "strength_training", "statReward": "STR", "xpReward": 25}]'),

('str_stone_guardian', 'The Fallen Stone Guardian',
 'An ancient stone guardian has collapsed at the temple gates. The priests need strong hands to restore it.',
 'side', 'hard', 'Sister Meridia', 'restoration', '3-4 days',
 '[{"narrativeDescription": "Lift and position the guardian''s massive stone components", "mechanicalDescription": "Complete heavy lifting exercises", "goalMapping": "strength_training", "statReward": "STR", "xpReward": 35}]'),

('str_lumber_crisis', 'The Lumber Crisis',
 'The village needs timber for winter repairs, but the woodcutters are short-handed.',
 'side', 'easy', 'Old Garrett', 'survival', '1-2 days',
 '[{"narrativeDescription": "Help cut and haul timber for the village", "mechanicalDescription": "Complete any physical exercise session", "goalMapping": "exercise", "statReward": "STR", "xpReward": 15}]'),

-- ============================================
-- DEXTERITY (DEX) FOCUSED QUESTS
-- ============================================

('dex_shadow_courier', 'The Shadow Courier''s Path',
 'A sensitive message must reach the castle before dawn. Stealth and agility are paramount.',
 'side', 'medium', 'The Hooded Messenger', 'stealth', '1-2 days',
 '[{"narrativeDescription": "Navigate the city rooftops to deliver the message undetected", "mechanicalDescription": "Complete a cardio or agility workout", "goalMapping": "cardio", "statReward": "DEX", "xpReward": 25}]'),

('dex_dancers_apprentice', 'The Dancer''s Apprentice',
 'Lady Isabelle seeks a partner for the upcoming royal ball. Grace and coordination are essential.',
 'side', 'easy', 'Lady Isabelle', 'social', '2-3 days',
 '[{"narrativeDescription": "Learn the intricate court dances under Lady Isabelle''s guidance", "mechanicalDescription": "Complete a flexibility or dance workout", "goalMapping": "flexibility", "statReward": "DEX", "xpReward": 20}]'),

('dex_herb_gatherer', 'The Cliff-Side Herbs',
 'Rare healing herbs grow only on treacherous cliff faces. The healer needs your nimble hands.',
 'side', 'hard', 'Healer Mordecai', 'gathering', '2-3 days',
 '[{"narrativeDescription": "Scale the dangerous cliffs to gather rare moonpetal herbs", "mechanicalDescription": "Complete a yoga or stretching session", "goalMapping": "yoga", "statReward": "DEX", "xpReward": 30}]'),

-- ============================================
-- CONSTITUTION (CON) FOCUSED QUESTS
-- ============================================

('con_marathon_messenger', 'The Marathon of Messages',
 'The relay system has failed. Someone must run the entire route to deliver urgent news.',
 'main', 'hard', 'Captain Helena', 'survival', '3-4 days',
 '[{"narrativeDescription": "Run the entire messenger route to Fort Ironhold", "mechanicalDescription": "Complete a long cardio session (30+ minutes)", "goalMapping": "cardio", "statReward": "CON", "xpReward": 40}]'),

('con_night_watch', 'The Night Watch',
 'Something stalks the village at night. A vigilant guardian is needed until dawn.',
 'side', 'medium', 'Sheriff Brennan', 'protection', '1-2 days',
 '[{"narrativeDescription": "Keep watch through the entire night to protect the village", "mechanicalDescription": "Get at least 7 hours of quality sleep", "goalMapping": "sleep", "statReward": "CON", "xpReward": 25}]'),

('con_hot_springs_trial', 'The Hot Springs Purification',
 'The monks require assistance with their endurance ritual in the mountain hot springs.',
 'side', 'easy', 'Brother Kai', 'spiritual', '1 day',
 '[{"narrativeDescription": "Endure the full Purification Trial in the hot springs", "mechanicalDescription": "Complete a meditation or relaxation session", "goalMapping": "meditation", "statReward": "CON", "xpReward": 15}]'),

-- ============================================
-- INTELLIGENCE (INT) FOCUSED QUESTS
-- ============================================

('int_lost_library', 'The Lost Library',
 'Ancient texts have been discovered in a sealed vault. A scholar is needed to catalogue them.',
 'side', 'medium', 'Archivist Penelope', 'knowledge', '3-4 days',
 '[{"narrativeDescription": "Study and catalogue the ancient manuscripts", "mechanicalDescription": "Read for at least 30 minutes", "goalMapping": "reading", "statReward": "INT", "xpReward": 25}]'),

('int_puzzle_dungeon', 'The Puzzle Master''s Challenge',
 'A legendary dungeon tests minds, not might. Solve its riddles to claim the prize within.',
 'main', 'hard', 'The Puzzle Master', 'adventure', '4-5 days',
 '[{"narrativeDescription": "Solve the intricate puzzles of the dungeon", "mechanicalDescription": "Complete a learning activity (course, tutorial, or educational content)", "goalMapping": "learning", "statReward": "INT", "xpReward": 40}]'),

('int_alchemy_assistant', 'The Alchemist''s Assistant',
 'Master Cornelius needs help researching a new potion. Careful reading and note-taking required.',
 'side', 'easy', 'Master Cornelius', 'crafting', '1-2 days',
 '[{"narrativeDescription": "Research and cross-reference alchemical formulas", "mechanicalDescription": "Read an article or chapter on any educational topic", "goalMapping": "reading", "statReward": "INT", "xpReward": 15}]'),

-- ============================================
-- WISDOM (WIS) FOCUSED QUESTS
-- ============================================

('wis_spirit_communion', 'The Spirit Communion',
 'The forest spirits are restless. A calm mind is needed to commune with them.',
 'side', 'medium', 'Druid Willow', 'spiritual', '2-3 days',
 '[{"narrativeDescription": "Enter deep meditation to commune with the forest spirits", "mechanicalDescription": "Complete a 15+ minute meditation session", "goalMapping": "meditation", "statReward": "WIS", "xpReward": 25}]'),

('wis_elder_stories', 'Tales of the Elders',
 'The village storyteller is gathering wisdom tales. Patience and reflection are needed.',
 'side', 'easy', 'Grandmother Rosa', 'social', '1-2 days',
 '[{"narrativeDescription": "Listen to and reflect on Grandmother Rosa''s wisdom tales", "mechanicalDescription": "Practice mindfulness or journaling", "goalMapping": "mindfulness", "statReward": "WIS", "xpReward": 15}]'),

('wis_oracle_riddle', 'The Oracle''s Riddle',
 'The Oracle speaks in riddles that require deep contemplation to understand.',
 'main', 'hard', 'The Oracle', 'mystery', '3-4 days',
 '[{"narrativeDescription": "Contemplate the Oracle''s cryptic wisdom through extended meditation", "mechanicalDescription": "Complete daily meditation for 3 days", "goalMapping": "meditation", "statReward": "WIS", "xpReward": 40}]'),

-- ============================================
-- CHARISMA (CHA) FOCUSED QUESTS
-- ============================================

('cha_diplomatic_mission', 'The Diplomatic Mission',
 'Two rival guilds are on the brink of war. A charismatic mediator is desperately needed.',
 'main', 'hard', 'Councilwoman Viera', 'politics', '4-5 days',
 '[{"narrativeDescription": "Negotiate peace between the rival guilds", "mechanicalDescription": "Have a meaningful conversation with a friend or family member", "goalMapping": "social", "statReward": "CHA", "xpReward": 40}]'),

('cha_tavern_tales', 'Tavern Tales',
 'The bard is sick and the tavern needs entertainment. Time to work the crowd.',
 'side', 'easy', 'Innkeeper Molly', 'social', '1 day',
 '[{"narrativeDescription": "Entertain the tavern patrons with stories and conversation", "mechanicalDescription": "Engage in social activity (call a friend, attend an event)", "goalMapping": "social", "statReward": "CHA", "xpReward": 15}]'),

('cha_shy_apprentice', 'Mentoring the Shy Apprentice',
 'A talented but timid apprentice needs help building confidence.',
 'side', 'medium', 'Master Aldric', 'mentoring', '2-3 days',
 '[{"narrativeDescription": "Help Timothy build confidence through patient mentoring", "mechanicalDescription": "Practice self-care or do something kind for yourself", "goalMapping": "self_care", "statReward": "CHA", "xpReward": 25}]');

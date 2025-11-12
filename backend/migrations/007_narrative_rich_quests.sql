/**
 * Migration 007: Narrative-Rich Quest Fields
 *
 * Adds fields to support narrative-first quest generation:
 * - Opening scene (immersive story introduction)
 * - NPC dialogue (opening, during, completion)
 * - World context (what's happening in Thornhaven)
 * - Story beats for objectives
 */

-- Add narrative fields to quests table
ALTER TABLE quests ADD COLUMN IF NOT EXISTS opening_scene TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_context TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS npc_dialogue JSONB DEFAULT '{}'::jsonb;

-- Add narrative fields to quest_objectives
ALTER TABLE quest_objectives ADD COLUMN IF NOT EXISTS narrative_description TEXT;
ALTER TABLE quest_objectives ADD COLUMN IF NOT EXISTS mechanical_description TEXT;
ALTER TABLE quest_objectives ADD COLUMN IF NOT EXISTS story_beat TEXT;

-- Update existing objectives to have both descriptions
UPDATE quest_objectives
SET narrative_description = description,
    mechanical_description = description
WHERE narrative_description IS NULL;

-- Add comments
COMMENT ON COLUMN quests.opening_scene IS 'Immersive narrative scene (100-150 words) introducing the quest';
COMMENT ON COLUMN quests.npc_dialogue IS 'NPC dialogue: {npcName, opening, during, completion}';
COMMENT ON COLUMN quests.world_context IS 'What''s happening in Thornhaven related to this quest';
COMMENT ON COLUMN quest_objectives.narrative_description IS 'Story framing: "Prove your worth to the Pillar of Might"';
COMMENT ON COLUMN quest_objectives.mechanical_description IS 'What they actually do: "Complete 3 strength training sessions"';
COMMENT ON COLUMN quest_objectives.story_beat IS 'Narrative that plays when this objective completes';

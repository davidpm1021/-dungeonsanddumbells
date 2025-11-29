# Quick Combat Testing Guide

## Test Account Credentials
- **Username:** testuser1763518029407
- **Password:** TestPass123!
- **Character:** Test Hero (Fighter, Level 1)

## URLs
- **Login:** http://localhost:5174/login
- **DM Mode:** http://localhost:5174/dm

## Combat Test Actions
Try these in DM mode to trigger combat:

1. `I attack the bandit`
2. `I draw my sword and charge`
3. `I cast fireball at the goblin`
4. `I strike the orc with my axe`
5. `I defend against the incoming attack`

## Expected Flow
1. Type combat action → Combat Detector analyzes
2. If combat detected → CombatUI appears with:
   - Enemy HP bars
   - Your character stats
   - Quick action buttons (Attack/Move/Defend)
   - Turn tracker
3. Combat runs turn-based with D&D 5e rules
4. Victory/defeat narrative generated

## Backend Logs to Watch
The backend will show:
```
[CombatDetector] Analyzing action: I attack the bandit
[CombatDetector] Result: Combat! X enemies
[DMOrchestrator] Step 2.7: Combat triggered
[CombatManager] Initializing encounter...
```

## Troubleshooting
- Not logged in? Clear localStorage and login again
- No character? Go to /character/create first
- Combat not triggering? Check backend logs for errors
- Frontend errors? Check browser console (F12)

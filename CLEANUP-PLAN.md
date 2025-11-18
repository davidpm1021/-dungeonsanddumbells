# Codebase Cleanup Plan

**Goal:** Organize test files, remove obsolete scripts, and follow best practices for clean codebase structure without breaking existing functionality.

## Current State Analysis

### Backend Root (23 files - TOO MANY!)
```
add-combat-endpoints.js
check-characters.js
check-table.js
interactive-dm.js
run-migration-006.js
test-ai-quest-generation.js
test-combat-integration.js
test-combat-phase2b.js
test-combat-phase2c.js
test-combat-system.js
test-consequence-engine.js
test-full-pipeline.js
test-goal-quest-integration.js
test-long-narrative.js
test-lorekeeper-validation.js
test-mvp-complete.js
test-narrative-with-memory.js
test-orchestration.js
test-phase5-complete.js
test-quest-generation.js
test-single-quest-debug.js
test-skill-check.js
test-story-generation.js
```

### Project Root (3 test files - SHOULD BE IN backend/tests/)
```
test-api.js
test-quest-api.js
test-quest-data.js
```

### tests/ Directory (3 old spec files - OBSOLETE?)
```
tests/phase5-full-pipeline.spec.js
tests/e2e.spec.js
tests/components.spec.js
```

### e2e/ Directory (2 spec files - KEEP)
```
e2e/full-flow.spec.js
e2e/e2e-health-test.spec.js
```

## Proposed Actions

### 1. Create Proper Test Directory Structure

```
backend/
├── tests/
│   ├── integration/     # End-to-end integration tests
│   ├── unit/           # Unit tests for individual services
│   ├── combat/         # Combat system tests
│   └── utilities/      # Test utilities and helpers
└── scripts/            # One-off utility scripts
```

### 2. Files to KEEP (Move to backend/tests/)

**Integration Tests (backend/tests/integration/):**
- ✅ `test-combat-integration.js` - **CURRENT TEST** - Just fixed! Validates combat detection
- ✅ `test-full-pipeline.js` - Comprehensive end-to-end test
- ⚠️ `test-orchestration.js` - If still validates DM orchestrator
- ⚠️ `test-narrative-with-memory.js` - If validates memory system

**Combat Tests (backend/tests/combat/):**
- ⚠️ `test-combat-system.js` - If tests base combat mechanics
- ⚠️ `test-combat-phase2b.js` - If contains unique combat tests
- ⚠️ `test-combat-phase2c.js` - If contains unique condition tests
- ⚠️ `test-skill-check.js` - If validates skill check detector

**Utilities (backend/tests/utilities/):**
- ✅ `interactive-dm.js` - Useful CLI tool for manual testing

### 3. Files to ARCHIVE (Move to backend/tests/archive/)

**Old Phase Tests (completed, may have historical value):**
- `test-phase5-complete.js` - Phase 5 is complete
- `test-mvp-complete.js` - MVP is complete
- `test-ai-quest-generation.js` - Early quest generation test
- `test-quest-generation.js` - Early quest generation test
- `test-lorekeeper-validation.js` - Early lorekeeper test
- `test-consequence-engine.js` - Early consequence engine test
- `test-goal-quest-integration.js` - Early integration test
- `test-story-generation.js` - Early story generation test
- `test-long-narrative.js` - Early narrative test

**Debug Scripts (one-off debugging):**
- `test-single-quest-debug.js` - Specific debug script

**Rationale:** These tests were useful during development but are now superseded by comprehensive integration tests. Archive them instead of deleting in case we need to reference them later.

### 4. Files to DELETE (One-off scripts that served their purpose)

**Migration/Setup Scripts:**
- ❌ `run-migration-006.js` - One-off migration script (migration is done)
- ❌ `add-combat-endpoints.js` - One-off endpoint setup (endpoints exist)

**Database Check Scripts:**
- ❌ `check-characters.js` - One-off DB check (can use SQL directly)
- ❌ `check-table.js` - One-off DB check (can use SQL directly)

**Rationale:** These scripts were needed once. They clutter the codebase and can be recreated if needed.

### 5. Project Root Tests (Move to backend/tests/integration/)

- `test-api.js` → `backend/tests/integration/test-api.js`
- `test-quest-api.js` → `backend/tests/integration/test-quest-api.js`
- `test-quest-data.js` → `backend/tests/integration/test-quest-data.js`

**Rationale:** Test files should not live in project root - they belong in the backend tests directory.

### 6. Old tests/ Directory (DELETE)

- ❌ `tests/phase5-full-pipeline.spec.js` - Superseded by `test-full-pipeline.js`
- ❌ `tests/e2e.spec.js` - Superseded by `e2e/full-flow.spec.js`
- ❌ `tests/components.spec.js` - Old Playwright test (if not used)

**Rationale:** These appear to be duplicates or old versions of current tests. Verify before deleting.

### 7. E2E Directory (KEEP as-is)

- ✅ `e2e/full-flow.spec.js`
- ✅ `e2e/e2e-health-test.spec.js`

**Rationale:** These are Playwright E2E tests - proper location at project root.

## Proposed Final Structure

```
-dungeonsanddumbells/
├── backend/
│   ├── src/              # Application code
│   ├── tests/            # NEW: Organized test directory
│   │   ├── integration/  # End-to-end integration tests
│   │   │   ├── test-combat-integration.js
│   │   │   ├── test-full-pipeline.js
│   │   │   ├── test-api.js
│   │   │   ├── test-quest-api.js
│   │   │   └── test-quest-data.js
│   │   ├── combat/       # Combat-specific tests
│   │   │   ├── test-combat-system.js (if keeping)
│   │   │   ├── test-combat-phase2b.js (if keeping)
│   │   │   └── test-skill-check.js (if keeping)
│   │   ├── utilities/    # Test utilities
│   │   │   └── interactive-dm.js
│   │   └── archive/      # Old tests (historical reference)
│   │       ├── test-phase5-complete.js
│   │       ├── test-mvp-complete.js
│   │       └── [other old phase tests]
│   └── scripts/          # NEW: One-off scripts (if any remain)
├── e2e/                  # Playwright E2E tests
│   ├── full-flow.spec.js
│   └── e2e-health-test.spec.js
├── frontend/             # React application
└── tests/                # DELETE THIS DIRECTORY (obsolete)
```

## Implementation Steps

1. **Create directories:**
   ```bash
   mkdir backend/tests
   mkdir backend/tests/integration
   mkdir backend/tests/combat
   mkdir backend/tests/utilities
   mkdir backend/tests/archive
   ```

2. **Move integration tests:**
   ```bash
   mv backend/test-combat-integration.js backend/tests/integration/
   mv backend/test-full-pipeline.js backend/tests/integration/
   mv test-api.js backend/tests/integration/
   mv test-quest-api.js backend/tests/integration/
   mv test-quest-data.js backend/tests/integration/
   ```

3. **Move combat tests (if keeping):**
   ```bash
   mv backend/test-combat-system.js backend/tests/combat/
   mv backend/test-combat-phase2b.js backend/tests/combat/
   mv backend/test-skill-check.js backend/tests/combat/
   ```

4. **Move utility:**
   ```bash
   mv backend/interactive-dm.js backend/tests/utilities/
   ```

5. **Archive old phase tests:**
   ```bash
   mv backend/test-phase5-complete.js backend/tests/archive/
   mv backend/test-mvp-complete.js backend/tests/archive/
   mv backend/test-ai-quest-generation.js backend/tests/archive/
   # ... (move all old phase tests)
   ```

6. **Delete obsolete scripts:**
   ```bash
   rm backend/run-migration-006.js
   rm backend/add-combat-endpoints.js
   rm backend/check-characters.js
   rm backend/check-table.js
   ```

7. **Delete old tests directory:**
   ```bash
   rm -rf tests/
   ```

## Verification Steps

After cleanup:

1. ✅ Run `cd backend/tests/integration && node test-combat-integration.js`
2. ✅ Run `cd backend/tests/integration && node test-full-pipeline.js`
3. ✅ Run `npm run dev` (backend) - ensure server starts
4. ✅ Run `npm run dev` (frontend) - ensure frontend starts
5. ✅ Manual test: /DM interface with combat detection
6. ✅ Run `npx playwright test` (e2e tests)

## Impact Analysis

**What will break:**
- ❌ Any hardcoded paths to test files in scripts/docs
- ❌ Any CI/CD pipelines referencing old test locations
- ❌ CLAUDE.md references to specific test files

**What will NOT break:**
- ✅ Application code (no changes to src/)
- ✅ Dependencies (no package.json changes)
- ✅ Database (no schema changes)
- ✅ API endpoints (no route changes)

## CLAUDE.md Updates Required

After cleanup, update CLAUDE.md:

1. Remove references to deleted test files
2. Update test file paths to new locations
3. Add section on test organization:
   ```
   ## Test Organization
   - Integration tests: backend/tests/integration/
   - Combat tests: backend/tests/combat/
   - Test utilities: backend/tests/utilities/
   - Archived tests: backend/tests/archive/
   - E2E tests: e2e/
   ```

## Questions to Resolve

Before proceeding, please confirm:

1. ❓ Should we keep `test-combat-phase2b.js` and `test-combat-phase2c.js`? (Phase 2 is complete)
2. ❓ Should we keep `test-orchestration.js`? (Is it still validating current orchestrator?)
3. ❓ Should we keep `test-narrative-with-memory.js`? (Is memory system still being validated?)
4. ❓ Are the files in `tests/` directory completely obsolete? (Safe to delete?)
5. ❓ Any other test files you specifically want to preserve?

## Risk Level: LOW

This cleanup is **low risk** because:
- We're not touching application code
- We're archiving (not deleting) most old tests
- We're only deleting one-off scripts that served their purpose
- All changes are easily reversible via git

---

**Ready to proceed?** Review this plan and let me know if you approve, or if you want to adjust any decisions.

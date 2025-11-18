const fs = require('fs');
const path = require('path');

const dmPath = path.join(__dirname, 'src', 'pages', 'DungeonMaster.jsx');
let content = fs.readFileSync(dmPath, 'utf8');

// 1. Add CombatUI import
if (!content.includes('import CombatUI')) {
  content = content.replace(
    "import api from '../services/api';",
    "import api from '../services/api';\nimport CombatUI from '../components/CombatUI';"
  );
}

// 2. Add combat state to useState declarations
const stateAddition = `
  // Combat state
  const [combat, setCombat] = useState(null);
  const [combatConditions, setCombatConditions] = useState([]);`;

if (!content.includes('const [combat, setCombat]')) {
  content = content.replace(
    'const messagesEndRef = useRef(null);',
    `const messagesEndRef = useRef(null);${stateAddition}`
  );
}

// 3. Add checkActiveCombat function
const checkCombatFunc = `
  // Check for active combat
  const checkActiveCombat = async () => {
    if (!character.id) return;
    try {
      const response = await api.get(\`/dm/combat/active?characterId=\${character.id}\`);
      if (response.data) {
        setCombat(response.data);
        if (response.data.activeConditions) {
          setCombatConditions(response.data.activeConditions);
        }
      } else {
        setCombat(null);
        setCombatConditions([]);
      }
    } catch (error) {
      // No active combat
      setCombat(null);
    }
  };

  // Check for combat periodically when adventure is active
  useEffect(() => {
    if (setupStep === 'ready' && character.id) {
      checkActiveCombat();
      const interval = setInterval(checkActiveCombat, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [setupStep, character.id]);`;

if (!content.includes('const checkActiveCombat')) {
  content = content.replace(
    'const addMessage = (type, content, metadata = {}) => {',
    `${checkCombatFunc}\n\n  const addMessage = (type, content, metadata = {}) => {`
  );
}

// 4. Add handleCombatAction function
const combatActionFunc = `
  const handleCombatAction = async (action) => {
    if (!combat) return;
    setIsLoading(true);
    addMessage('player', action);

    try {
      const response = await api.post('/dm/combat/action', {
        encounterId: combat.encounter?.id || combat.id,
        action
      });

      const result = response.data;

      if (result.description) {
        addMessage('dm', result.description);
      }

      if (result.combatEnded) {
        addMessage('system', result.victoryMessage || 'Combat ended');
        setCombat(null);
      } else {
        // Update combat state
        setCombat(result);
        if (result.activeConditions) {
          setCombatConditions(result.activeConditions);
        }
      }
    } catch (error) {
      addMessage('system', 'Combat action failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };`;

if (!content.includes('const handleCombatAction')) {
  content = content.replace(
    'const handleSubmit = async (e) => {',
    `${combatActionFunc}\n\n  const handleSubmit = async (e) => {`
  );
}

// 5. Modify handleSubmit to check for combat keywords and init combat if needed
const submitModification = `
    // Check if action triggers combat
    const actionLower = playerAction.toLowerCase();
    if (actionLower.includes('attack') || actionLower.includes('fight') || actionLower.includes('combat')) {
      // Check if there's already active combat
      await checkActiveCombat();
    }`;

if (!content.includes('// Check if action triggers combat')) {
  // Insert after the "addMessage('player', playerAction);" line
  content = content.replace(
    "addMessage('player', playerAction);\n    setIsLoading(true);",
    `addMessage('player', playerAction);\n${submitModification}\n    setIsLoading(true);`
  );
}

// 6. Update the DM response handling to detect combat
const responseModification = `
      // Check if DM response initiated combat
      if (result.combat || result.combatInitiated) {
        setCombat(result.combat);
        if (result.combat?.activeConditions) {
          setCombatConditions(result.combat.activeConditions);
        }
      }`;

if (!content.includes('// Check if DM response initiated combat')) {
  content = content.replace(
    "if (result.achievement) {\n        addMessage('system', `Achievement Unlocked: ${result.achievement}`);\n      }",
    `if (result.achievement) {\n        addMessage('system', \`Achievement Unlocked: \${result.achievement}\`);\n      }\n${responseModification}`
  );
}

// 7. Add CombatUI component to the render
const combatUIRender = `
          {/* Combat UI */}
          {combat && (
            <CombatUI
              combat={combat}
              onAction={handleCombatAction}
              isLoading={isLoading}
            />
          )}
`;

if (!content.includes('{/* Combat UI */}')) {
  // Insert after the header div
  content = content.replace(
    '      {/* Messages */}\n      <div className="flex-1 overflow-y-auto p-4">',
    `${combatUIRender}\n      {/* Messages */}\n      <div className="flex-1 overflow-y-auto p-4">`
  );
}

fs.writeFileSync(dmPath, content, 'utf8');
console.log('✅ Combat integration added to DungeonMaster.jsx');

/**
 * Combat Narrative Generator
 *
 * Provides rich, varied narrative descriptions for combat actions
 * to make combat feel more immersive and exciting.
 */
class CombatNarrative {
  /**
   * Generate attack hit description
   *
   * @param {Object} params - Attack parameters
   * @returns {string} Narrative description
   */
  generateHitDescription(params) {
    const {
      attackerName,
      targetName,
      weaponName,
      damage,
      isCritical,
      damagePercent, // Percent of target's max HP
      totalDamage
    } = params;

    if (isCritical) {
      return this.getCriticalHitDescription(attackerName, targetName, weaponName, damage);
    }

    // Vary description based on damage dealt
    if (damagePercent >= 50) {
      return this.getMassiveDamageDescription(attackerName, targetName, weaponName, damage);
    } else if (damagePercent >= 25) {
      return this.getHeavyDamageDescription(attackerName, targetName, weaponName, damage);
    } else if (damagePercent >= 10) {
      return this.getModerateDamageDescription(attackerName, targetName, weaponName, damage);
    } else {
      return this.getLightDamageDescription(attackerName, targetName, weaponName, damage);
    }
  }

  /**
   * Critical hit descriptions (natural 20)
   */
  getCriticalHitDescription(attacker, target, weapon, damage) {
    const descriptions = [
      `**CRITICAL HIT!** ${attacker} finds a perfect opening and strikes ${target} with devastating precision! Your ${weapon} deals ${damage} damage!`,
      `**CRITICAL HIT!** ${attacker}'s ${weapon} finds its mark with deadly accuracy, cutting deep into ${target} for ${damage} damage!`,
      `**CRITICAL HIT!** A perfect strike! ${attacker} exploits a gap in ${target}'s defenses, dealing ${damage} crushing damage!`,
      `**CRITICAL HIT!** ${attacker}'s ${weapon} connects with bone-shattering force, dealing ${damage} damage to ${target}!`,
      `**CRITICAL HIT!** Time seems to slow as ${attacker}'s ${weapon} arcs through the air, striking ${target} for ${damage} damage!`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Massive damage descriptions (50%+ of max HP)
   */
  getMassiveDamageDescription(attacker, target, weapon, damage) {
    const descriptions = [
      `${attacker} unleashes a devastating blow with their ${weapon}, nearly felling ${target} with ${damage} damage!`,
      `${attacker}'s ${weapon} crashes into ${target} with brutal force, dealing ${damage} massive damage!`,
      `A thunderous impact! ${attacker} strikes ${target} with overwhelming power for ${damage} damage!`,
      `${attacker} channels all their strength into the attack, ${weapon} tearing through ${target}'s defenses for ${damage} damage!`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Heavy damage descriptions (25-50% of max HP)
   */
  getHeavyDamageDescription(attacker, target, weapon, damage) {
    const descriptions = [
      `${attacker} lands a solid hit on ${target} with their ${weapon}, dealing ${damage} damage!`,
      `${attacker}'s ${weapon} strikes true, carving into ${target} for ${damage} damage!`,
      `A powerful blow! ${attacker}'s ${weapon} connects solidly with ${target}, dealing ${damage} damage!`,
      `${attacker} presses the attack, their ${weapon} finding flesh and dealing ${damage} damage to ${target}!`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Moderate damage descriptions (10-25% of max HP)
   */
  getModerateDamageDescription(attacker, target, weapon, damage) {
    const descriptions = [
      `${attacker}'s ${weapon} cuts across ${target}, dealing ${damage} damage.`,
      `${attacker} strikes ${target} with their ${weapon}, inflicting ${damage} damage.`,
      `${attacker}'s ${weapon} finds its mark, dealing ${damage} damage to ${target}.`,
      `A quick strike! ${attacker} hits ${target} with their ${weapon} for ${damage} damage.`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Light damage descriptions (<10% of max HP)
   */
  getLightDamageDescription(attacker, target, weapon, damage) {
    const descriptions = [
      `${attacker}'s ${weapon} glances off ${target}, dealing only ${damage} damage.`,
      `A shallow cut! ${attacker}'s ${weapon} barely penetrates ${target}'s defenses for ${damage} damage.`,
      `${attacker} nicks ${target} with their ${weapon}, dealing ${damage} damage.`,
      `${attacker}'s ${weapon} scrapes ${target} for ${damage} minor damage.`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Generate miss description
   */
  generateMissDescription(params) {
    const {
      attackerName,
      targetName,
      weaponName,
      isCriticalMiss,
      attackRoll,
      targetAC
    } = params;

    if (isCriticalMiss) {
      return this.getCriticalMissDescription(attackerName, targetName, weaponName);
    }

    const margin = targetAC - attackRoll;

    if (margin >= 10) {
      return this.getWideMissDescription(attackerName, targetName, weaponName);
    } else if (margin >= 5) {
      return this.getModerateMissDescription(attackerName, targetName, weaponName);
    } else {
      return this.getNarrowMissDescription(attackerName, targetName, weaponName);
    }
  }

  /**
   * Critical miss descriptions (natural 1)
   */
  getCriticalMissDescription(attacker, target, weapon) {
    const descriptions = [
      `**CRITICAL MISS!** ${attacker}'s ${weapon} swings wildly off-target, leaving them momentarily off-balance!`,
      `**CRITICAL MISS!** ${attacker} stumbles mid-swing, their ${weapon} cutting only air as ${target} easily sidesteps!`,
      `**CRITICAL MISS!** The ${weapon} slips in ${attacker}'s grip, the attack going embarrassingly wide!`,
      `**CRITICAL MISS!** ${attacker} overcommits to the strike, ${weapon} missing ${target} by a wide margin!`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Wide miss descriptions (missed by 10+)
   */
  getWideMissDescription(attacker, target, weapon) {
    const descriptions = [
      `${attacker}'s ${weapon} swings wide, missing ${target} by a considerable margin.`,
      `${target} easily evades ${attacker}'s clumsy ${weapon} strike.`,
      `${attacker}'s ${weapon} cuts through empty air as ${target} dodges aside.`,
      `The ${weapon} whistles harmlessly past ${target} as ${attacker}'s attack goes astray.`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Moderate miss descriptions (missed by 5-9)
   */
  getModerateMissDescription(attacker, target, weapon) {
    const descriptions = [
      `${attacker}'s ${weapon} strikes toward ${target}, but fails to connect.`,
      `${target} parries ${attacker}'s ${weapon} aside with practiced ease.`,
      `${attacker}'s ${weapon} is deflected by ${target}'s defenses.`,
      `${target} twists away from ${attacker}'s ${weapon} at the last moment.`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Narrow miss descriptions (missed by 1-4)
   */
  getNarrowMissDescription(attacker, target, weapon) {
    const descriptions = [
      `${attacker}'s ${weapon} comes within inches of ${target}, but doesn't quite connect!`,
      `So close! ${attacker}'s ${weapon} grazes ${target}'s armor but fails to penetrate.`,
      `${target} barely deflects ${attacker}'s ${weapon} strike at the last possible moment!`,
      `${attacker}'s ${weapon} clangs off ${target}'s armor, the strike narrowly failing to land true.`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Generate movement description
   */
  generateMovementDescription(params) {
    const {
      characterName,
      fromZone,
      toZone,
      isAdvancing,
      enemyPresent
    } = params;

    if (isAdvancing) {
      return this.getAdvanceDescription(characterName, fromZone, toZone, enemyPresent);
    } else {
      return this.getRetreatDescription(characterName, fromZone, toZone, enemyPresent);
    }
  }

  /**
   * Advance descriptions
   */
  getAdvanceDescription(character, from, to, enemyPresent) {
    if (to === 'close') {
      const descriptions = [
        `${character} charges forward into close combat, weapon at the ready!`,
        `${character} closes the distance, moving into striking range!`,
        `${character} advances boldly, entering melee range!`,
        `${character} rushes forward to engage at close quarters!`
      ];
      return this.randomChoice(descriptions);
    } else {
      const descriptions = [
        `${character} moves forward to ${to} range.`,
        `${character} advances to ${to} range, maintaining pressure.`,
        `${character} steps closer, moving to ${to} range.`
      ];
      return this.randomChoice(descriptions);
    }
  }

  /**
   * Retreat descriptions
   */
  getRetreatDescription(character, from, to, enemyPresent) {
    if (from === 'close') {
      const descriptions = [
        `${character} disengages from melee, retreating to ${to} range!`,
        `${character} breaks away from close combat, falling back to ${to} range!`,
        `${character} creates distance, backing up to ${to} range!`,
        `${character} steps back defensively, moving to ${to} range!`
      ];
      return this.randomChoice(descriptions);
    } else {
      const descriptions = [
        `${character} retreats to ${to} range, maintaining a safe distance.`,
        `${character} falls back to ${to} range.`,
        `${character} withdraws to ${to} range, staying cautious.`
      ];
      return this.randomChoice(descriptions);
    }
  }

  /**
   * Generate condition application description
   */
  generateConditionDescription(params) {
    const {
      targetName,
      conditionType,
      conditionName,
      source
    } = params;

    const conditionDescriptions = {
      grappled: [
        `${targetName} is grappled! Their movement is completely restricted!`,
        `${targetName} struggles in vain as they are held fast!`,
        `${targetName} is seized and held firmly in place!`
      ],
      prone: [
        `${targetName} is knocked prone, falling to the ground!`,
        `${targetName} loses their footing and crashes down!`,
        `${targetName} is sent sprawling to the ground!`
      ],
      frightened: [
        `${targetName} is overcome with fear, their courage faltering!`,
        `Terror grips ${targetName}, making them hesitate!`,
        `${targetName} feels dread wash over them, weakening their resolve!`
      ],
      stunned: [
        `${targetName} is stunned, unable to think or act clearly!`,
        `${targetName} reels from the impact, dazed and disoriented!`,
        `${targetName} stands frozen, momentarily incapacitated!`
      ],
      poisoned: [
        `${targetName} is poisoned! Toxins course through their veins!`,
        `Poison takes effect on ${targetName}, weakening them!`,
        `${targetName} feels the poison's effects sapping their strength!`
      ],
      paralyzed: [
        `${targetName} is paralyzed, unable to move a muscle!`,
        `${targetName}'s body locks up, completely immobilized!`,
        `${targetName} stands frozen, paralyzed and helpless!`
      ],
      blinded: [
        `${targetName} is blinded, unable to see!`,
        `Darkness engulfs ${targetName}'s vision!`,
        `${targetName} can no longer see their surroundings!`
      ],
      restrained: [
        `${targetName} is restrained, their movements severely limited!`,
        `Bonds tighten around ${targetName}, restraining them!`,
        `${targetName} is held fast, unable to move freely!`
      ]
    };

    const descriptions = conditionDescriptions[conditionType] || [
      `${targetName} is afflicted with ${conditionName}!`
    ];

    let desc = this.randomChoice(descriptions);
    if (source) {
      desc += ` (${source})`;
    }

    return desc;
  }

  /**
   * Generate enemy defeat description
   */
  generateDefeatDescription(enemyName, killingBlow) {
    const descriptions = [
      `${enemyName} collapses, defeated!`,
      `With a final cry, ${enemyName} falls!`,
      `${enemyName} crumples to the ground, vanquished!`,
      `${enemyName} goes down hard, defeated by your prowess!`,
      `${killingBlow} - ${enemyName} is defeated!`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Generate player defeat description
   */
  generatePlayerDefeatDescription(characterName) {
    const descriptions = [
      `${characterName} falls to the ground, grievously wounded!`,
      `${characterName} collapses, unable to continue fighting!`,
      `${characterName}'s vision fades as they succumb to their injuries!`,
      `${characterName} drops to their knees, defeated!`
    ];

    return this.randomChoice(descriptions);
  }

  /**
   * Generate combat victory description
   */
  generateVictoryDescription(characterName, enemiesDefeated) {
    if (enemiesDefeated === 1) {
      const descriptions = [
        `Victory! ${characterName} stands triumphant over their fallen foe!`,
        `${characterName} emerges victorious from the battle!`,
        `With the last enemy defeated, ${characterName} catches their breath!`,
        `${characterName} has won the day!`
      ];
      return this.randomChoice(descriptions);
    } else {
      const descriptions = [
        `Victory! ${characterName} stands victorious over ${enemiesDefeated} defeated enemies!`,
        `${characterName} emerges triumphant, having bested ${enemiesDefeated} foes!`,
        `The battle is won! ${characterName} has defeated all ${enemiesDefeated} enemies!`,
        `${characterName} stands alone amidst ${enemiesDefeated} fallen enemies - victorious!`
      ];
      return this.randomChoice(descriptions);
    }
  }

  /**
   * Helper: Select random item from array
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

module.exports = new CombatNarrative();

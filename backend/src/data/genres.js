/**
 * Genre Definitions for Procedural World Generation
 *
 * Each genre provides narrative constraints and flavor that the AI uses
 * to generate a unique world tailored to the player's character and goals.
 */

const GENRES = {
  dark_fantasy: {
    id: 'dark_fantasy',
    name: 'Dark Fantasy',
    description: 'Grim worlds where hope is scarce and every victory costs something',
    tone: ['gritty', 'morally grey', 'survival', 'consequences matter'],
    themes: ['redemption', 'corruption', 'sacrifice', 'legacy'],
    aesthetics: ['ancient ruins', 'cursed lands', 'dying kingdoms', 'eldritch threats'],
    narrativeHooks: [
      'cursed bloodline seeking cure',
      'last survivor of destroyed order',
      'exile returning to hostile homeland',
      'hunter becoming the hunted'
    ],
    avoidClichés: ['chosen one prophecy', 'clear good vs evil', 'magic solves everything']
  },

  cosmic_horror: {
    id: 'cosmic_horror',
    name: 'Cosmic Horror',
    description: 'Reality is fragile, truth is maddening, and humanity is insignificant',
    tone: ['atmospheric', 'unsettling', 'mysterious', 'existential dread'],
    themes: ['forbidden knowledge', 'sanity vs truth', 'incomprehensible forces', 'isolation'],
    aesthetics: ['impossible geometry', 'dreams bleeding into reality', 'ancient sleeping things', 'coastal decay'],
    narrativeHooks: [
      'researcher who saw too much',
      'inheritor of cursed estate',
      'sailor who survived the impossible',
      'cultist having second thoughts'
    ],
    avoidClichés: ['Cthulhu name-drops', 'instant madness', 'tentacles everywhere']
  },

  wuxia: {
    id: 'wuxia',
    name: 'Wuxia',
    description: 'Martial heroes navigate honor, revenge, and the jianghu underworld',
    tone: ['honorable', 'poetic', 'disciplined', 'romantic tragedy'],
    themes: ['revenge vs justice', 'master and student', 'honor codes', 'sacrifice for love'],
    aesthetics: ['mountain temples', 'bamboo forests', 'tea houses', 'martial sects'],
    narrativeHooks: [
      'disciple avenging murdered master',
      'retired warrior forced back',
      'orphan discovering heritage',
      'rival schools, forbidden love'
    ],
    avoidClichés: ['instant kung fu mastery', 'generic asian stereotypes', 'honor without nuance']
  },

  steampunk: {
    id: 'steampunk',
    name: 'Steampunk',
    description: 'Industrial revolution meets adventure in a world of brass and steam',
    tone: ['inventive', 'class-conscious', 'rebellious', 'wonder mixed with grime'],
    themes: ['progress vs tradition', 'class warfare', 'invention and consequence', 'personal freedom'],
    aesthetics: ['clockwork cities', 'airships', 'underground resistance', 'mad science'],
    narrativeHooks: [
      'inventor whose creation was stolen',
      'street urchin with mechanical arm',
      'aristocrat funding revolution',
      'sky pirate with a code'
    ],
    avoidClichés: ['goggles for no reason', 'steam powers everything magically', 'victorian = moral']
  },

  norse_mythology: {
    id: 'norse_mythology',
    name: 'Norse Mythology',
    description: 'Fate is written but heroes rage against it anyway',
    tone: ['fatalistic', 'heroic', 'brutal', 'poetic'],
    themes: ['fate vs free will', 'glory in death', 'loyalty and betrayal', 'wisdom through suffering'],
    aesthetics: ['frozen wastes', 'mead halls', 'world tree branches', 'rune magic'],
    narrativeHooks: [
      'warrior seeking worthy death',
      'seer cursed with prophecy',
      'thrall breaking free',
      'god-touched mortal'
    ],
    avoidClichés: ['vikings = raiders only', 'simplistic Valhalla', 'random rune magic']
  },

  post_apocalyptic: {
    id: 'post_apocalyptic',
    name: 'Post-Apocalyptic',
    description: 'Civilization fell, but humanity endures in the ruins',
    tone: ['survivalist', 'hopeful desperation', 'resourceful', 'community vs isolation'],
    themes: ['rebuilding', 'what makes us human', 'trust in chaos', 'legacy of old world'],
    aesthetics: ['overgrown cities', 'scavenger camps', 'toxic zones', 'makeshift technology'],
    narrativeHooks: [
      'vault dweller emerging',
      'courier with vital cargo',
      'settlement defender',
      'wastelander seeking home'
    ],
    avoidClichés: ['edgy nihilism', 'lone wolf forever', 'radiation = superpowers']
  },

  urban_fantasy: {
    id: 'urban_fantasy',
    name: 'Urban Fantasy',
    description: 'Magic hides in plain sight in modern cities',
    tone: ['noir-ish', 'secret society', 'mundane meets magical', 'investigative'],
    themes: ['hidden worlds', 'double life', 'power and secrecy', 'belonging'],
    aesthetics: ['neon-lit alleyways', 'supernatural nightclubs', 'magic shops', 'council meetings'],
    narrativeHooks: [
      'newly awakened to magic',
      'supernatural PI',
      'witch hiding in suburbs',
      'half-blood between worlds'
    ],
    avoidClichés: ['vampires and werewolves at war', 'magic makes life easy', 'chosen one again']
  },

  sword_and_sorcery: {
    id: 'sword_and_sorcery',
    name: 'Sword & Sorcery',
    description: 'Personal stakes, morally grey heroes, and ancient evils',
    tone: ['pulpy', 'action-driven', 'morally flexible', 'adventure-focused'],
    themes: ['survival', 'treasure and glory', 'ancient evils', 'personal code'],
    aesthetics: ['crumbling temples', 'desert cities', 'jungle ruins', 'barbaric lands'],
    narrativeHooks: [
      'barbarian far from home',
      'thief with expensive tastes',
      'mercenary with principles',
      'sorcerer avoiding their past'
    ],
    avoidClichés: ['save the world plots', 'pure good heroes', 'magic without cost']
  }
};

/**
 * Get narrative guidance for world generation based on genre
 */
const getGenrePromptGuidance = (genreId) => {
  const genre = GENRES[genreId];
  if (!genre) return null;

  return `
GENRE: ${genre.name}
${genre.description}

TONE: ${genre.tone.join(', ')}
THEMES TO EXPLORE: ${genre.themes.join(', ')}
AESTHETIC ELEMENTS: ${genre.aesthetics.join(', ')}

AVOID: ${genre.avoidClichés.join(', ')}

Example narrative hooks (adapt, don't copy):
${genre.narrativeHooks.map(h => `- ${h}`).join('\n')}
`;
};

module.exports = {
  GENRES,
  getGenrePromptGuidance
};

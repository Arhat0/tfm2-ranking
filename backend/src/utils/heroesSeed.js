/**
 * Teamfight Manager 2 职业（英雄）列表种子数据
 * 数据来源：游戏 bundle.game_data 本地化文件中的 68 个职业 key
 * 定位（category）来源：teamfightmanager2.com/champions 官方数据 + 游戏内技能类型分析
 *   Melee=近战  Range=远程  Magician=法师  Util=辅助  Assassin=刺客
 */
const HEROES = [
  // ===== 近战 Melee =====
  { key: 'fighter', name_en: 'Fighter', name_zh: '格斗家', category: 'Melee' },
  { key: 'swordman', name_en: 'Swordsman', name_zh: '剑士', category: 'Melee' },
  { key: 'dual_blader', name_en: 'Dual Blader', name_zh: '双刀客', category: 'Melee' },
  { key: 'berserker', name_en: 'Berserker', name_zh: '狂战士', category: 'Melee' },
  { key: 'executioner', name_en: 'Executioner', name_zh: '处刑人', category: 'Melee' },
  { key: 'knight', name_en: 'Knight', name_zh: '骑士', category: 'Melee' },
  { key: 'hammerer', name_en: 'Hammerer', name_zh: '锤兵', category: 'Melee' },
  { key: 'shield_bearer', name_en: 'Shield Bearer', name_zh: '盾卫', category: 'Melee' },
  { key: 'pole_warrior', name_en: 'Pole Warrior', name_zh: '长杆战士', category: 'Melee' },
  { key: 'lancer', name_en: 'Lancer', name_zh: '长枪手', category: 'Melee' },
  { key: 'ogre', name_en: 'Ogre', name_zh: '食人魔', category: 'Melee' },
  { key: 'cavalry_knight', name_en: 'Cavalry Knight', name_zh: '骑兵', category: 'Melee' },
  { key: 'magic_knight', name_en: 'Magic Knight', name_zh: '魔剑士', category: 'Melee' },
  { key: 'android', name_en: 'Android', name_zh: '人造人', category: 'Melee' },
  { key: 'vampire', name_en: 'Vampire', name_zh: '吸血鬼', category: 'Melee' },
  { key: 'werewolf', name_en: 'Werewolf', name_zh: '狼人', category: 'Melee' },
  { key: 'dokkaebi', name_en: 'Dokkaebi', name_zh: '鬼怪', category: 'Melee' },
  { key: 'jiangshi', name_en: 'Jiangshi', name_zh: '僵尸', category: 'Melee' },
  { key: 'strongman', name_en: 'Strongman', name_zh: '大力士', category: 'Melee' },
  { key: 'prisoner', name_en: 'Prisoner', name_zh: '囚徒', category: 'Melee' },
  { key: 'nightmare', name_en: 'Nightmare', name_zh: '梦魇', category: 'Melee' },
  { key: 'siege_breaker', name_en: 'Siege Breaker', name_zh: '攻城兵', category: 'Melee' },
  { key: 'monk', name_en: 'Monk', name_zh: '武僧', category: 'Melee' },

  // ===== 远程 Range =====
  { key: 'archer', name_en: 'Archer', name_zh: '弓箭手', category: 'Range' },
  { key: 'boomerang_hunter', name_en: 'Boomerang Hunter', name_zh: '回旋镖猎手', category: 'Range' },
  { key: 'gunner', name_en: 'Gunner', name_zh: '枪手', category: 'Range' },
  { key: 'soldier', name_en: 'Soldier', name_zh: '步枪兵', category: 'Range' },
  { key: 'crossbowman', name_en: 'Crossbowman', name_zh: '弩手', category: 'Range' },
  { key: 'harpooner', name_en: 'Harpooner', name_zh: '鱼叉手', category: 'Range' },
  { key: 'whip_master', name_en: 'Whip Master', name_zh: '鞭师', category: 'Range' },
  { key: 'bomber', name_en: 'Bomber', name_zh: '炸弹人', category: 'Range' },
  { key: 'dancer', name_en: 'Dancer', name_zh: '舞者', category: 'Range' },
  { key: 'gambler', name_en: 'Gambler', name_zh: '赌徒', category: 'Range' },
  { key: 'poison_dart_hunter', name_en: 'Poison Dart Hunter', name_zh: '毒镖猎手', category: 'Range' },

  // ===== 法师 Magician =====
  { key: 'astrologer', name_en: 'Astrologer', name_zh: '占星术士', category: 'Magician' },
  { key: 'ice_mage', name_en: 'Ice Mage', name_zh: '冰霜法师', category: 'Magician' },
  { key: 'pyromancer', name_en: 'Pyromancer', name_zh: '火焰法师', category: 'Magician' },
  { key: 'lightning_mage', name_en: 'Lightning Mage', name_zh: '雷电法师', category: 'Magician' },
  { key: 'sand_mage', name_en: 'Sand Mage', name_zh: '沙暴法师', category: 'Magician' },
  { key: 'dark_mage', name_en: 'Dark Mage', name_zh: '黑暗法师', category: 'Magician' },
  { key: 'shadowmancer', name_en: 'Shadowmancer', name_zh: '暗影法师', category: 'Magician' },
  { key: 'wind_mage', name_en: 'Wind Mage', name_zh: '风魔法师', category: 'Magician' },
  { key: 'white_mage', name_en: 'White Mage', name_zh: '白魔法师', category: 'Magician' },
  { key: 'barrier_magician', name_en: 'Barrier Magician', name_zh: '结界师', category: 'Magician' },
  { key: 'necromancer', name_en: 'Necromancer', name_zh: '死灵法师', category: 'Magician' },
  { key: 'illusionist', name_en: 'Illusionist', name_zh: '幻术师', category: 'Magician' },
  { key: 'pythoness', name_en: 'Pythoness', name_zh: '女祭司', category: 'Magician' },
  { key: 'voodoo_shaman', name_en: 'Voodoo Shaman', name_zh: '巫毒萨满', category: 'Magician' },
  { key: 'taoist', name_en: 'Taoist', name_zh: '道士', category: 'Magician' },
  { key: 'exorcist', name_en: 'Exorcist', name_zh: '驱魔师', category: 'Magician' },
  { key: 'alchemist', name_en: 'Alchemist', name_zh: '炼金术士', category: 'Magician' },
  { key: 'spellbreaker', name_en: 'Spellbreaker', name_zh: '破法者', category: 'Magician' },
  { key: 'spirit_caller', name_en: 'Spirit Caller', name_zh: '通灵师', category: 'Magician' },

  // ===== 辅助 Util =====
  { key: 'priest', name_en: 'Priest', name_zh: '牧师', category: 'Util' },
  { key: 'bard', name_en: 'Bard', name_zh: '吟游诗人', category: 'Util' },
  { key: 'clown', name_en: 'Clown', name_zh: '小丑', category: 'Util' },
  { key: 'circus_blade', name_en: 'Circus Blade', name_zh: '杂技师', category: 'Util' },
  { key: 'chef', name_en: 'Chef', name_zh: '厨师', category: 'Util' },
  { key: 'enchanter', name_en: 'Enchanter', name_zh: '附魔师', category: 'Util' },
  { key: 'inquisitor', name_en: 'Inquisitor', name_zh: '审判官', category: 'Util' },
  { key: 'druid', name_en: 'Druid', name_zh: '德鲁伊', category: 'Util' },
  { key: 'plague_doctor', name_en: 'Plague Doctor', name_zh: '瘟疫医生', category: 'Util' },
  { key: 'guardian_spirit', name_en: 'Guardian Spirit', name_zh: '守护灵', category: 'Util' },

  // ===== 刺客 Assassin =====
  { key: 'demon', name_en: 'Demon', name_zh: '恶魔', category: 'Assassin' },
  { key: 'ghost', name_en: 'Ghost', name_zh: '幽灵', category: 'Assassin' },
  { key: 'hitman', name_en: 'Hitman', name_zh: '杀手', category: 'Assassin' },
  { key: 'hunter', name_en: 'Hunter', name_zh: '猎人', category: 'Assassin' },
  { key: 'ninja', name_en: 'Ninja', name_zh: '忍者', category: 'Assassin' },
];

module.exports = { HEROES };

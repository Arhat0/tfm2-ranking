/**
 * Elo 积分算法
 */

// K 因子：根据分数段调整，低分段变化大，高分段变化小
function getKFactor(score) {
  if (score < 1400) return 32;
  if (score < 1800) return 24;
  return 16;
}

// 计算预期胜率
function expectedScore(playerA, playerB) {
  return 1 / (1 + Math.pow(10, (playerB - playerA) / 400));
}

// 计算双方分数变化
function calculateElo(playerAScore, playerBScore, winnerIsA) {
  const kA = getKFactor(playerAScore);
  const kB = getKFactor(playerBScore);

  const expectedA = expectedScore(playerAScore, playerBScore);
  const expectedB = 1 - expectedA;

  const actualA = winnerIsA ? 1 : 0;
  const actualB = winnerIsA ? 0 : 1;

  const changeA = Math.round(kA * (actualA - expectedA));
  const changeB = Math.round(kB * (actualB - expectedB));

  return {
    playerA: {
      before: playerAScore,
      after: Math.max(0, playerAScore + changeA),
      change: changeA,
    },
    playerB: {
      before: playerBScore,
      after: Math.max(0, playerBScore + changeB),
      change: changeB,
    },
  };
}

// 根据分数获取段位
function getTier(score) {
  if (score >= 2000) return 'Master';
  if (score >= 1800) return 'Diamond';
  if (score >= 1600) return 'Platinum';
  if (score >= 1400) return 'Gold';
  if (score >= 1200) return 'Silver';
  return 'Bronze';
}

// 段位颜色（前端用）
const TIER_COLORS = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#00CED1',
  Diamond: '#B9F2FF',
  Master: '#FF6B6B',
};

module.exports = { calculateElo, getTier, getKFactor, expectedScore, TIER_COLORS };

const express = require('express');

const router = express.Router();

/**
 * 一键对战：游戏启动配置（公开）
 * Teamfight Manager 2 Steam AppID: 3009300
 * 浏览器可通过 steam://rungameid/<appId> 协议直接拉起本地 Steam 并启动游戏。
 */
const GAME_APP_ID = process.env.TFM2_APP_ID || '3009300';

router.get('/launch-config', (req, res) => {
  res.json({
    appId: GAME_APP_ID,
    gameName: 'Teamfight Manager 2',
    launchUrl: `steam://rungameid/${GAME_APP_ID}`,
    storeUrl: `https://store.steampowered.com/app/${GAME_APP_ID}/Teamfight_Manager_2/`,
  });
});

module.exports = router;

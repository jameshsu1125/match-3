import { Match3Game } from './pages/home/Match3Game';

// 等待 DOM 載入完成後初始化遊戲
document.addEventListener('DOMContentLoaded', () => {
  try {
    // 創建新的 Match3 遊戲實例
    const game = new Match3Game('viewport');

    // 可以通過這些方法控制遊戲
    console.log('Match3 Game initialized successfully!');
    console.log('Current score:', game.getScore());

    // 示例：如何從外部控制遊戲
    // game.newGame(); // 開始新遊戲
    // game.toggleShowMoves(); // 切換顯示可移動提示
    // game.toggleAIBot(); // 切換 AI 機器人
  } catch (error) {
    console.error('Failed to initialize Match3 Game:', error);
  }
});

// 導出遊戲類別供其他模組使用
export { Match3Game } from './pages/home/Match3Game';

# Match-3 Game - TypeScript 類別版本

這是將原始 JavaScript Match-3 遊戲轉換為 TypeScript 類別架構的版本。

## 主要改進

### 🎯 TypeScript 轉換
- 完整的類型定義和介面
- 強型別檢查
- 更好的程式碼提示和錯誤檢測

### 🏗️ 類別架構
- 將所有功能封裝在 `Match3Game` 類別中
- 清晰的公開和私有方法分離
- 更好的程式碼組織和維護性

### 📝 類型安全
- 定義了完整的介面：`Tile`, `Position`, `Cluster`, `Move` 等
- 使用 TypeScript enum 管理遊戲狀態
- 所有參數和返回值都有明確的類型

## 檔案結構

```
src/
├── Match3Game.ts    # 主要遊戲類別
└── index.ts         # 遊戲初始化和導出
index.html           # HTML 範例頁面
```

## 使用方法

### 基本使用

```typescript
import { Match3Game } from './src/Match3Game';

// 創建遊戲實例
const game = new Match3Game('canvas-id');

// 遊戲會自動開始
```

### 公開方法

```typescript
// 開始新遊戲
game.newGame();

// 獲取當前分數
const score = game.getScore();

// 檢查遊戲是否結束
const isOver = game.isGameOver();

// 切換顯示可移動提示
game.toggleShowMoves();

// 切換 AI 機器人
game.toggleAIBot();
```

## 開發和運行

### 安裝依賴
```bash
npm install
```

### 開發模式
```bash
npm run match3:dev
```

### 建置生產版本
```bash
npm run match3:build
```

### 預覽建置結果
```bash
npm run match3:preview
```

## 遊戲特色

- **拖拽操作**：點擊並拖拽方塊來交換位置
- **自動偵測**：自動偵測和清除三個或更多連線的方塊
- **動畫效果**：流暢的移動和消除動畫
- **分數系統**：根據連線長度計算分數
- **AI 機器人**：自動遊玩功能
- **移動提示**：顯示可能的移動選項
- **遊戲結束偵測**：當沒有可用移動時結束遊戲

## 技術特點

### 類別設計
- 使用 ES6+ 類別語法
- 私有方法和屬性的清晰分離
- 事件處理器正確綁定 `this` 上下文

### TypeScript 特性
- 嚴格的類型檢查
- 介面定義所有資料結構
- 枚舉管理遊戲狀態
- 完整的類型安全

### 效能優化
- 使用 `requestAnimationFrame` 進行流暢動畫
- 有效的碰撞偵測和座標計算
- 優化的叢集搜尋演算法

## 原始程式碼來源

基於 Rembound.com 的 HTML5 Canvas Match-3 遊戲教學，並完全重構為 TypeScript 類別版本。

## 授權

遵循原始程式碼的 GNU General Public License v3.0 授權。
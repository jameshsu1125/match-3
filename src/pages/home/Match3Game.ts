// ------------------------------------------------------------------------
// Match-3 Game TypeScript Class Version
// Based on Rembound.com's HTML5 Canvas Match-3 Tutorial
// Converted to TypeScript with class-based architecture
// ------------------------------------------------------------------------

// 類型定義
interface Tile {
  type: number;
  shift: number;
}

interface Position {
  x: number;
  y: number;
}

interface TileCoordinate {
  tilex: number;
  tiley: number;
}

interface MouseTileResult {
  valid: boolean;
  x: number;
  y: number;
}

interface SelectedTile {
  selected: boolean;
  column: number;
  row: number;
}

interface Level {
  x: number;
  y: number;
  columns: number;
  rows: number;
  tilewidth: number;
  tileheight: number;
  tiles: Tile[][];
  selectedtile: SelectedTile;
}

interface Cluster {
  column: number;
  row: number;
  length: number;
  horizontal: boolean;
}

interface Move {
  column1: number;
  row1: number;
  column2: number;
  row2: number;
}

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

enum GameState {
  INIT = 0,
  READY = 1,
  RESOLVE = 2,
}

export default class Match3Game {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  // Timing and frames per second
  private lastframe: number = 0;
  private fpstime: number = 0;
  private framecount: number = 0;
  private fps: number = 0;

  // Mouse dragging
  private drag: boolean = false;

  // Level configuration
  private level: Level = {
    x: 250,
    y: 113,
    columns: 8,
    rows: 8,
    tilewidth: 40,
    tileheight: 40,
    tiles: [],
    selectedtile: { selected: false, column: 0, row: 0 },
  };

  // Tile colors in RGB
  private readonly tilecolors: number[][] = [
    [255, 128, 128],
    [128, 255, 128],
    [128, 128, 255],
    [255, 255, 128],
    [255, 128, 255],
    [128, 255, 255],
    [255, 255, 255],
  ];

  // Game data
  private clusters: Cluster[] = [];
  private moves: Move[] = [];
  private currentmove: Move = { column1: 0, row1: 0, column2: 0, row2: 0 };

  // Game state
  private gamestate: GameState = GameState.INIT;
  private score: number = 0;

  // Animation variables
  private animationstate: number = 0;
  private animationtime: number = 0;
  private readonly animationtimetotal: number = 0.3;

  // Features
  private showmoves: boolean = false;
  private aibot: boolean = false;
  private gameover: boolean = false;

  // GUI buttons
  private buttons: Button[] = [
    { x: 30, y: 240, width: 150, height: 50, text: 'New Game' },
    { x: 30, y: 300, width: 150, height: 50, text: 'Show Moves' },
    { x: 30, y: 360, width: 150, height: 50, text: 'Enable AI Bot' },
  ];

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.context = context;

    this.init();
  }

  private init(): void {
    // Add mouse events
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseout', this.onMouseOut.bind(this));

    // Initialize the two-dimensional tile array
    for (let i = 0; i < this.level.columns; i++) {
      this.level.tiles[i] = [];
      for (let j = 0; j < this.level.rows; j++) {
        this.level.tiles[i][j] = { type: 0, shift: 0 };
      }
    }

    // Start new game
    this.newGame();

    // Enter main loop
    this.main(0);
  }

  private main = (tframe: number): void => {
    window.requestAnimationFrame(this.main);
    this.update(tframe);
    this.render();
  };

  private update(tframe: number): void {
    const dt = (tframe - this.lastframe) / 1000;
    this.lastframe = tframe;

    this.updateFps(dt);

    if (this.gamestate === GameState.READY) {
      // Game is ready for player input
      if (this.moves.length <= 0) {
        this.gameover = true;
      }

      // AI bot logic
      if (this.aibot) {
        this.animationtime += dt;
        if (this.animationtime > this.animationtimetotal) {
          this.findMoves();

          if (this.moves.length > 0) {
            const move = this.moves[Math.floor(Math.random() * this.moves.length)];
            this.mouseSwap(move.column1, move.row1, move.column2, move.row2);
          }
          this.animationtime = 0;
        }
      }
    } else if (this.gamestate === GameState.RESOLVE) {
      this.animationtime += dt;

      if (this.animationstate === 0) {
        if (this.animationtime > this.animationtimetotal) {
          this.findClusters();

          if (this.clusters.length > 0) {
            // Add points to score
            for (const cluster of this.clusters) {
              this.score += 100 * (cluster.length - 2);
            }

            this.removeClusters();
            this.animationstate = 1;
          } else {
            this.gamestate = GameState.READY;
          }
          this.animationtime = 0;
        }
      } else if (this.animationstate === 1) {
        if (this.animationtime > this.animationtimetotal) {
          this.shiftTiles();
          this.animationstate = 0;
          this.animationtime = 0;

          this.findClusters();
          if (this.clusters.length <= 0) {
            this.gamestate = GameState.READY;
          }
        }
      } else if (this.animationstate === 2) {
        if (this.animationtime > this.animationtimetotal) {
          this.swap(
            this.currentmove.column1,
            this.currentmove.row1,
            this.currentmove.column2,
            this.currentmove.row2,
          );

          this.findClusters();
          if (this.clusters.length > 0) {
            this.animationstate = 0;
            this.animationtime = 0;
            this.gamestate = GameState.RESOLVE;
          } else {
            this.animationstate = 3;
            this.animationtime = 0;
          }

          this.findMoves();
          this.findClusters();
        }
      } else if (this.animationstate === 3) {
        if (this.animationtime > this.animationtimetotal) {
          this.swap(
            this.currentmove.column1,
            this.currentmove.row1,
            this.currentmove.column2,
            this.currentmove.row2,
          );
          this.gamestate = GameState.READY;
        }
      }

      this.findMoves();
      this.findClusters();
    }
  }

  private updateFps(dt: number): void {
    if (this.fpstime > 0.25) {
      this.fps = Math.round(this.framecount / this.fpstime);
      this.fpstime = 0;
      this.framecount = 0;
    }

    this.fpstime += dt;
    this.framecount++;
  }

  private drawCenterText(text: string, x: number, y: number, width: number): void {
    const textdim = this.context.measureText(text);
    this.context.fillText(text, x + (width - textdim.width) / 2, y);
  }

  private render(): void {
    this.drawFrame();

    // Draw score
    this.context.fillStyle = '#000000';
    this.context.font = '24px Verdana';
    this.drawCenterText('Score:', 30, this.level.y + 40, 150);
    this.drawCenterText(this.score.toString(), 30, this.level.y + 70, 150);

    this.drawButtons();

    // Draw level background
    const levelwidth = this.level.columns * this.level.tilewidth;
    const levelheight = this.level.rows * this.level.tileheight;
    this.context.fillStyle = '#000000';
    this.context.fillRect(this.level.x - 4, this.level.y - 4, levelwidth + 8, levelheight + 8);

    this.renderTiles();
    this.renderClusters();

    if (this.showmoves && this.clusters.length <= 0 && this.gamestate === GameState.READY) {
      this.renderMoves();
    }

    // Game Over overlay
    if (this.gameover) {
      this.context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.context.fillRect(this.level.x, this.level.y, levelwidth, levelheight);

      this.context.fillStyle = '#ffffff';
      this.context.font = '24px Verdana';
      this.drawCenterText(
        'Game Over!',
        this.level.x,
        this.level.y + levelheight / 2 + 10,
        levelwidth,
      );
    }
  }

  private drawFrame(): void {
    this.context.fillStyle = '#d0d0d0';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = '#e8eaec';
    this.context.fillRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);

    this.context.fillStyle = '#303030';
    this.context.fillRect(0, 0, this.canvas.width, 65);

    this.context.fillStyle = '#ffffff';
    this.context.font = '24px Verdana';
    this.context.fillText('Match3 Example - TypeScript Class', 10, 30);

    this.context.fillStyle = '#ffffff';
    this.context.font = '12px Verdana';
    this.context.fillText('Fps: ' + this.fps, 13, 50);
  }

  private drawButtons(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      this.context.fillStyle = '#000000';
      this.context.fillRect(
        this.buttons[i].x,
        this.buttons[i].y,
        this.buttons[i].width,
        this.buttons[i].height,
      );

      this.context.fillStyle = '#ffffff';
      this.context.font = '18px Verdana';
      const textdim = this.context.measureText(this.buttons[i].text);
      this.context.fillText(
        this.buttons[i].text,
        this.buttons[i].x + (this.buttons[i].width - textdim.width) / 2,
        this.buttons[i].y + 30,
      );
    }
  }

  private renderTiles(): void {
    for (let i = 0; i < this.level.columns; i++) {
      for (let j = 0; j < this.level.rows; j++) {
        const shift = this.level.tiles[i][j].shift;
        const coord = this.getTileCoordinate(
          i,
          j,
          0,
          (this.animationtime / this.animationtimetotal) * shift,
        );

        if (this.level.tiles[i][j].type >= 0) {
          const col = this.tilecolors[this.level.tiles[i][j].type];
          this.drawTile(coord.tilex, coord.tiley, col[0], col[1], col[2]);
        }

        if (this.level.selectedtile.selected) {
          if (this.level.selectedtile.column === i && this.level.selectedtile.row === j) {
            this.drawTile(coord.tilex, coord.tiley, 255, 0, 0);
          }
        }
      }
    }

    // Render swap animation
    if (
      this.gamestate === GameState.RESOLVE &&
      (this.animationstate === 2 || this.animationstate === 3)
    ) {
      const shiftx = this.currentmove.column2 - this.currentmove.column1;
      const shifty = this.currentmove.row2 - this.currentmove.row1;

      const coord1 = this.getTileCoordinate(this.currentmove.column1, this.currentmove.row1, 0, 0);
      const coord1shift = this.getTileCoordinate(
        this.currentmove.column1,
        this.currentmove.row1,
        (this.animationtime / this.animationtimetotal) * shiftx,
        (this.animationtime / this.animationtimetotal) * shifty,
      );
      const col1 =
        this.tilecolors[this.level.tiles[this.currentmove.column1][this.currentmove.row1].type];

      const coord2 = this.getTileCoordinate(this.currentmove.column2, this.currentmove.row2, 0, 0);
      const coord2shift = this.getTileCoordinate(
        this.currentmove.column2,
        this.currentmove.row2,
        (this.animationtime / this.animationtimetotal) * -shiftx,
        (this.animationtime / this.animationtimetotal) * -shifty,
      );
      const col2 =
        this.tilecolors[this.level.tiles[this.currentmove.column2][this.currentmove.row2].type];

      this.drawTile(coord1.tilex, coord1.tiley, 0, 0, 0);
      this.drawTile(coord2.tilex, coord2.tiley, 0, 0, 0);

      if (this.animationstate === 2) {
        this.drawTile(coord1shift.tilex, coord1shift.tiley, col1[0], col1[1], col1[2]);
        this.drawTile(coord2shift.tilex, coord2shift.tiley, col2[0], col2[1], col2[2]);
      } else {
        this.drawTile(coord2shift.tilex, coord2shift.tiley, col2[0], col2[1], col2[2]);
        this.drawTile(coord1shift.tilex, coord1shift.tiley, col1[0], col1[1], col1[2]);
      }
    }
  }

  private getTileCoordinate(
    column: number,
    row: number,
    columnoffset: number,
    rowoffset: number,
  ): TileCoordinate {
    const tilex = this.level.x + (column + columnoffset) * this.level.tilewidth;
    const tiley = this.level.y + (row + rowoffset) * this.level.tileheight;
    return { tilex, tiley };
  }

  private drawTile(x: number, y: number, r: number, g: number, b: number): void {
    this.context.fillStyle = `rgb(${r},${g},${b})`;
    this.context.fillRect(x + 2, y + 2, this.level.tilewidth - 4, this.level.tileheight - 4);
  }

  private renderClusters(): void {
    for (const cluster of this.clusters) {
      const coord = this.getTileCoordinate(cluster.column, cluster.row, 0, 0);

      if (cluster.horizontal) {
        this.context.fillStyle = '#00ff00';
        this.context.fillRect(
          coord.tilex + this.level.tilewidth / 2,
          coord.tiley + this.level.tileheight / 2 - 4,
          (cluster.length - 1) * this.level.tilewidth,
          8,
        );
      } else {
        this.context.fillStyle = '#0000ff';
        this.context.fillRect(
          coord.tilex + this.level.tilewidth / 2 - 4,
          coord.tiley + this.level.tileheight / 2,
          8,
          (cluster.length - 1) * this.level.tileheight,
        );
      }
    }
  }

  private renderMoves(): void {
    for (const move of this.moves) {
      const coord1 = this.getTileCoordinate(move.column1, move.row1, 0, 0);
      const coord2 = this.getTileCoordinate(move.column2, move.row2, 0, 0);

      this.context.strokeStyle = '#ff0000';
      this.context.beginPath();
      this.context.moveTo(
        coord1.tilex + this.level.tilewidth / 2,
        coord1.tiley + this.level.tileheight / 2,
      );
      this.context.lineTo(
        coord2.tilex + this.level.tilewidth / 2,
        coord2.tiley + this.level.tileheight / 2,
      );
      this.context.stroke();
    }
  }

  public newGame(): void {
    this.score = 0;
    this.gamestate = GameState.READY;
    this.gameover = false;
    this.createLevel();
    this.findMoves();
    this.findClusters();
  }

  private createLevel(): void {
    let done = false;

    while (!done) {
      for (let i = 0; i < this.level.columns; i++) {
        for (let j = 0; j < this.level.rows; j++) {
          this.level.tiles[i][j].type = this.getRandomTile();
        }
      }

      this.resolveClusters();
      this.findMoves();

      if (this.moves.length > 0) {
        done = true;
      }
    }
  }

  private getRandomTile(): number {
    return Math.floor(Math.random() * this.tilecolors.length);
  }

  private resolveClusters(): void {
    this.findClusters();

    while (this.clusters.length > 0) {
      this.removeClusters();
      this.shiftTiles();
      this.findClusters();
    }
  }

  private findClusters(): void {
    this.clusters = [];

    // Find horizontal clusters
    for (let j = 0; j < this.level.rows; j++) {
      let matchlength = 1;
      for (let i = 0; i < this.level.columns; i++) {
        let checkcluster = false;

        if (i === this.level.columns - 1) {
          checkcluster = true;
        } else {
          if (
            this.level.tiles[i][j].type === this.level.tiles[i + 1][j].type &&
            this.level.tiles[i][j].type !== -1
          ) {
            matchlength += 1;
          } else {
            checkcluster = true;
          }
        }

        if (checkcluster) {
          if (matchlength >= 3) {
            this.clusters.push({
              column: i + 1 - matchlength,
              row: j,
              length: matchlength,
              horizontal: true,
            });
          }
          matchlength = 1;
        }
      }
    }

    // Find vertical clusters
    for (let i = 0; i < this.level.columns; i++) {
      let matchlength = 1;
      for (let j = 0; j < this.level.rows; j++) {
        let checkcluster = false;

        if (j === this.level.rows - 1) {
          checkcluster = true;
        } else {
          if (
            this.level.tiles[i][j].type === this.level.tiles[i][j + 1].type &&
            this.level.tiles[i][j].type !== -1
          ) {
            matchlength += 1;
          } else {
            checkcluster = true;
          }
        }

        if (checkcluster) {
          if (matchlength >= 3) {
            this.clusters.push({
              column: i,
              row: j + 1 - matchlength,
              length: matchlength,
              horizontal: false,
            });
          }
          matchlength = 1;
        }
      }
    }
  }

  private findMoves(): void {
    this.moves = [];

    // Check horizontal swaps
    for (let j = 0; j < this.level.rows; j++) {
      for (let i = 0; i < this.level.columns - 1; i++) {
        this.swap(i, j, i + 1, j);
        this.findClusters();
        this.swap(i, j, i + 1, j);

        if (this.clusters.length > 0) {
          this.moves.push({ column1: i, row1: j, column2: i + 1, row2: j });
        }
      }
    }

    // Check vertical swaps
    for (let i = 0; i < this.level.columns; i++) {
      for (let j = 0; j < this.level.rows - 1; j++) {
        this.swap(i, j, i, j + 1);
        this.findClusters();
        this.swap(i, j, i, j + 1);

        if (this.clusters.length > 0) {
          this.moves.push({ column1: i, row1: j, column2: i, row2: j + 1 });
        }
      }
    }

    this.clusters = [];
  }

  private loopClusters(
    func: (index: number, column: number, row: number, cluster: Cluster) => void,
  ): void {
    for (let i = 0; i < this.clusters.length; i++) {
      const cluster = this.clusters[i];
      let coffset = 0;
      let roffset = 0;
      for (let j = 0; j < cluster.length; j++) {
        func(i, cluster.column + coffset, cluster.row + roffset, cluster);

        if (cluster.horizontal) {
          coffset++;
        } else {
          roffset++;
        }
      }
    }
  }

  private removeClusters(): void {
    this.loopClusters((_index, column, row, _cluster) => {
      this.level.tiles[column][row].type = -1;
    });

    for (let i = 0; i < this.level.columns; i++) {
      let shift = 0;
      for (let j = this.level.rows - 1; j >= 0; j--) {
        if (this.level.tiles[i][j].type === -1) {
          shift++;
          this.level.tiles[i][j].shift = 0;
        } else {
          this.level.tiles[i][j].shift = shift;
        }
      }
    }
  }

  private shiftTiles(): void {
    for (let i = 0; i < this.level.columns; i++) {
      for (let j = this.level.rows - 1; j >= 0; j--) {
        if (this.level.tiles[i][j].type === -1) {
          this.level.tiles[i][j].type = this.getRandomTile();
        } else {
          const shift = this.level.tiles[i][j].shift;
          if (shift > 0) {
            this.swap(i, j, i, j + shift);
          }
        }
        this.level.tiles[i][j].shift = 0;
      }
    }
  }

  private getMouseTile(pos: Position): MouseTileResult {
    const tx = Math.floor((pos.x - this.level.x) / this.level.tilewidth);
    const ty = Math.floor((pos.y - this.level.y) / this.level.tileheight);

    if (tx >= 0 && tx < this.level.columns && ty >= 0 && ty < this.level.rows) {
      return { valid: true, x: tx, y: ty };
    }

    return { valid: false, x: 0, y: 0 };
  }

  private canSwap(x1: number, y1: number, x2: number, y2: number): boolean {
    if ((Math.abs(x1 - x2) === 1 && y1 === y2) || (Math.abs(y1 - y2) === 1 && x1 === x2)) {
      return true;
    }
    return false;
  }

  private swap(x1: number, y1: number, x2: number, y2: number): void {
    const typeswap = this.level.tiles[x1][y1].type;
    this.level.tiles[x1][y1].type = this.level.tiles[x2][y2].type;
    this.level.tiles[x2][y2].type = typeswap;
  }

  private mouseSwap(c1: number, r1: number, c2: number, r2: number): void {
    this.currentmove = { column1: c1, row1: r1, column2: c2, row2: r2 };
    this.level.selectedtile.selected = false;
    this.animationstate = 2;
    this.animationtime = 0;
    this.gamestate = GameState.RESOLVE;
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(this.canvas, e);

    if (this.drag && this.level.selectedtile.selected) {
      const mt = this.getMouseTile(pos);
      if (mt.valid) {
        if (this.canSwap(mt.x, mt.y, this.level.selectedtile.column, this.level.selectedtile.row)) {
          this.mouseSwap(mt.x, mt.y, this.level.selectedtile.column, this.level.selectedtile.row);
        }
      }
    }
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(this.canvas, e);

    if (!this.drag) {
      const mt = this.getMouseTile(pos);

      if (mt.valid) {
        let swapped = false;
        if (this.level.selectedtile.selected) {
          if (mt.x === this.level.selectedtile.column && mt.y === this.level.selectedtile.row) {
            this.level.selectedtile.selected = false;
            this.drag = true;
            return;
          } else if (
            this.canSwap(mt.x, mt.y, this.level.selectedtile.column, this.level.selectedtile.row)
          ) {
            this.mouseSwap(mt.x, mt.y, this.level.selectedtile.column, this.level.selectedtile.row);
            swapped = true;
          }
        }

        if (!swapped) {
          this.level.selectedtile.column = mt.x;
          this.level.selectedtile.row = mt.y;
          this.level.selectedtile.selected = true;
        }
      } else {
        this.level.selectedtile.selected = false;
      }

      this.drag = true;
    }

    // Check button clicks
    for (let i = 0; i < this.buttons.length; i++) {
      if (
        pos.x >= this.buttons[i].x &&
        pos.x < this.buttons[i].x + this.buttons[i].width &&
        pos.y >= this.buttons[i].y &&
        pos.y < this.buttons[i].y + this.buttons[i].height
      ) {
        if (i === 0) {
          this.newGame();
        } else if (i === 1) {
          this.showmoves = !this.showmoves;
          this.buttons[i].text = (this.showmoves ? 'Hide' : 'Show') + ' Moves';
        } else if (i === 2) {
          this.aibot = !this.aibot;
          this.buttons[i].text = (this.aibot ? 'Disable' : 'Enable') + ' AI Bot';
        }
      }
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.drag = false;
  }

  private onMouseOut(_e: MouseEvent): void {
    this.drag = false;
  }

  private getMousePos(canvas: HTMLCanvasElement, e: MouseEvent): Position {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / (rect.right - rect.left)) * canvas.width),
      y: Math.round(((e.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height),
    };
  }

  // Public methods for external control
  public getScore(): number {
    return this.score;
  }

  public isGameOver(): boolean {
    return this.gameover;
  }

  public toggleShowMoves(): void {
    this.showmoves = !this.showmoves;
    this.buttons[1].text = (this.showmoves ? 'Hide' : 'Show') + ' Moves';
  }

  public toggleAIBot(): void {
    this.aibot = !this.aibot;
    this.buttons[2].text = (this.aibot ? 'Disable' : 'Enable') + ' AI Bot';
  }
}

import {
  Button,
  Cluster,
  GameState,
  TConfig,
  MouseTileResult,
  Move,
  Position,
  TileCoordinate,
  TState,
} from './type';

export default class Match3Game {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private score: number = 0;

  // Level configuration
  private config: TConfig = {
    x: 250,
    y: 113,
    columns: 8,
    rows: 8,
    tile: {
      width: 40,
      height: 40,
      data: [],
    },
    selected: { selected: false, column: 0, row: 0 },
  };

  private state: TState = {
    isDrag: false,
    status: GameState.INIT,
    time: {
      lastFrame: 0,
      fpsTime: 0,
      fps: 0,
      count: 0,
    },
    animation: {
      state: 0,
      time: 0,
      total: 0.3,
    },
  };

  // Tile colors in RGB
  private readonly tileColors: number[][] = [
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
  private currentMove: Move = { column1: 0, row1: 0, column2: 0, row2: 0 };

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
    for (let i = 0; i < this.config.columns; i++) {
      this.config.tile.data[i] = [];
      for (let j = 0; j < this.config.rows; j++) {
        this.config.tile.data[i][j] = { type: 0, shift: 0 };
      }
    }

    // Start new game
    this.newGame();

    // Enter main loop
    this.main(0);
  }

  private main = (delta: number): void => {
    window.requestAnimationFrame(this.main);
    this.update(delta);
    this.render();
  };

  private update(delta: number): void {
    const dt = (delta - this.state.time.lastFrame) / 1000;
    this.state.time.lastFrame = delta;

    this.updateFps(dt);

    if (this.state.status === GameState.READY) {
      // Game is ready for player input
      if (this.moves.length <= 0) {
        this.gameover = true;
      }

      // AI bot logic
      if (this.aibot) {
        this.state.animation.time += dt;
        if (this.state.animation.time > this.state.animation.total) {
          this.findMoves();

          if (this.moves.length > 0) {
            const move = this.moves[Math.floor(Math.random() * this.moves.length)];
            this.mouseSwap(move.column1, move.row1, move.column2, move.row2);
          }
          this.state.animation.time = 0;
        }
      }
    } else if (this.state.status === GameState.RESOLVE) {
      this.state.animation.time += dt;

      if (this.state.animation.state === 0) {
        if (this.state.animation.time > this.state.animation.total) {
          this.findClusters();

          if (this.clusters.length > 0) {
            // Add points to score
            for (const cluster of this.clusters) {
              this.score += 100 * (cluster.length - 2);
            }

            this.removeClusters();
            this.state.animation.state = 1;
          } else {
            this.state.status = GameState.READY;
          }
          this.state.animation.time = 0;
        }
      } else if (this.state.animation.state === 1) {
        if (this.state.animation.time > this.state.animation.total) {
          this.shiftTiles();
          this.state.animation.state = 0;
          this.state.animation.time = 0;

          this.findClusters();
          if (this.clusters.length <= 0) {
            this.state.status = GameState.READY;
          }
        }
      } else if (this.state.animation.state === 2) {
        if (this.state.animation.time > this.state.animation.total) {
          this.swap(
            this.currentMove.column1,
            this.currentMove.row1,
            this.currentMove.column2,
            this.currentMove.row2,
          );

          this.findClusters();
          if (this.clusters.length > 0) {
            this.state.animation.state = 0;
            this.state.animation.time = 0;
            this.state.status = GameState.RESOLVE;
          } else {
            this.state.animation.state = 3;
            this.state.animation.time = 0;
          }

          this.findMoves();
          this.findClusters();
        }
      } else if (this.state.animation.state === 3) {
        if (this.state.animation.time > this.state.animation.total) {
          this.swap(
            this.currentMove.column1,
            this.currentMove.row1,
            this.currentMove.column2,
            this.currentMove.row2,
          );
          this.state.status = GameState.READY;
        }
      }

      this.findMoves();
      this.findClusters();
    }
  }

  private updateFps(dt: number): void {
    if (this.state.time.fpsTime > 0.25) {
      this.state.time.fps = Math.round(this.state.time.count / this.state.time.fpsTime);
      this.state.time.fpsTime = 0;
      this.state.time.count = 0;
    }

    this.state.time.fpsTime += dt;
    this.state.time.count++;
  }

  private drawCenterText(text: string, x: number, y: number, width: number): void {
    const textdim = this.context.measureText(text);
    this.context.fillText(text, x + (width - textdim.width) / 2, y);
  }

  private render(): void {
    // Draw score
    this.context.fillStyle = '#000000';
    this.context.font = '24px Verdana';
    this.drawCenterText('Score:', 30, this.config.y + 40, 150);
    this.drawCenterText(this.score.toString(), 30, this.config.y + 70, 150);

    this.drawButtons();

    // Draw level background
    const levelwidth = this.config.columns * this.config.tile.width;
    const levelheight = this.config.rows * this.config.tile.height;
    this.context.fillStyle = '#000000';
    this.context.fillRect(this.config.x - 4, this.config.y - 4, levelwidth + 8, levelheight + 8);

    this.renderTiles();
    this.renderClusters();

    if (this.showmoves && this.clusters.length <= 0 && this.state.status === GameState.READY) {
      this.renderMoves();
    }

    // Game Over overlay
    if (this.gameover) {
      this.context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.context.fillRect(this.config.x, this.config.y, levelwidth, levelheight);

      this.context.fillStyle = '#ffffff';
      this.context.font = '24px Verdana';
      this.drawCenterText(
        'Game Over!',
        this.config.x,
        this.config.y + levelheight / 2 + 10,
        levelwidth,
      );
    }
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
    for (let i = 0; i < this.config.columns; i++) {
      for (let j = 0; j < this.config.rows; j++) {
        const shift = this.config.tile.data[i][j].shift;
        const coord = this.getTileCoordinate(
          i,
          j,
          0,
          (this.state.animation.time / this.state.animation.total) * shift,
        );

        if (this.config.tile.data[i][j].type >= 0) {
          const col = this.tileColors[this.config.tile.data[i][j].type];
          this.drawTile(coord.tilex, coord.tiley, col[0], col[1], col[2]);
        }

        if (this.config.selected.selected) {
          if (this.config.selected.column === i && this.config.selected.row === j) {
            this.drawTile(coord.tilex, coord.tiley, 255, 0, 0);
          }
        }
      }
    }

    // Render swap animation
    if (
      this.state.status === GameState.RESOLVE &&
      (this.state.animation.state === 2 || this.state.animation.state === 3)
    ) {
      const shiftx = this.currentMove.column2 - this.currentMove.column1;
      const shifty = this.currentMove.row2 - this.currentMove.row1;

      const coord1 = this.getTileCoordinate(this.currentMove.column1, this.currentMove.row1, 0, 0);
      const coord1shift = this.getTileCoordinate(
        this.currentMove.column1,
        this.currentMove.row1,
        (this.state.animation.time / this.state.animation.total) * shiftx,
        (this.state.animation.time / this.state.animation.total) * shifty,
      );
      const col1 =
        this.tileColors[
          this.config.tile.data[this.currentMove.column1][this.currentMove.row1].type
        ];

      const coord2 = this.getTileCoordinate(this.currentMove.column2, this.currentMove.row2, 0, 0);
      const coord2shift = this.getTileCoordinate(
        this.currentMove.column2,
        this.currentMove.row2,
        (this.state.animation.time / this.state.animation.total) * -shiftx,
        (this.state.animation.time / this.state.animation.total) * -shifty,
      );
      const col2 =
        this.tileColors[
          this.config.tile.data[this.currentMove.column2][this.currentMove.row2].type
        ];

      this.drawTile(coord1.tilex, coord1.tiley, 0, 0, 0);
      this.drawTile(coord2.tilex, coord2.tiley, 0, 0, 0);

      if (this.state.animation.state === 2) {
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
    const tilex = this.config.x + (column + columnoffset) * this.config.tile.width;
    const tiley = this.config.y + (row + rowoffset) * this.config.tile.height;
    return { tilex, tiley };
  }

  private drawTile(x: number, y: number, r: number, g: number, b: number): void {
    this.context.fillStyle = `rgb(${r},${g},${b})`;
    this.context.fillRect(x + 2, y + 2, this.config.tile.width - 4, this.config.tile.height - 4);
  }

  private renderClusters(): void {
    for (const cluster of this.clusters) {
      const coord = this.getTileCoordinate(cluster.column, cluster.row, 0, 0);

      if (cluster.horizontal) {
        this.context.fillStyle = '#00ff00';
        this.context.fillRect(
          coord.tilex + this.config.tile.width / 2,
          coord.tiley + this.config.tile.height / 2 - 4,
          (cluster.length - 1) * this.config.tile.width,
          8,
        );
      } else {
        this.context.fillStyle = '#0000ff';
        this.context.fillRect(
          coord.tilex + this.config.tile.width / 2 - 4,
          coord.tiley + this.config.tile.height / 2,
          8,
          (cluster.length - 1) * this.config.tile.height,
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
        coord1.tilex + this.config.tile.width / 2,
        coord1.tiley + this.config.tile.height / 2,
      );
      this.context.lineTo(
        coord2.tilex + this.config.tile.width / 2,
        coord2.tiley + this.config.tile.height / 2,
      );
      this.context.stroke();
    }
  }

  public newGame(): void {
    this.score = 0;
    this.state.status = GameState.READY;
    this.gameover = false;
    this.createLevel();
    this.findMoves();
    this.findClusters();
  }

  private createLevel(): void {
    let done = false;

    while (!done) {
      for (let i = 0; i < this.config.columns; i++) {
        for (let j = 0; j < this.config.rows; j++) {
          this.config.tile.data[i][j].type = this.getRandomTile();
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
    return Math.floor(Math.random() * this.tileColors.length);
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
    for (let j = 0; j < this.config.rows; j++) {
      let matchlength = 1;
      for (let i = 0; i < this.config.columns; i++) {
        let checkcluster = false;

        if (i === this.config.columns - 1) {
          checkcluster = true;
        } else {
          if (
            this.config.tile.data[i][j].type === this.config.tile.data[i + 1][j].type &&
            this.config.tile.data[i][j].type !== -1
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
    for (let i = 0; i < this.config.columns; i++) {
      let matchlength = 1;
      for (let j = 0; j < this.config.rows; j++) {
        let checkcluster = false;

        if (j === this.config.rows - 1) {
          checkcluster = true;
        } else {
          if (
            this.config.tile.data[i][j].type === this.config.tile.data[i][j + 1].type &&
            this.config.tile.data[i][j].type !== -1
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
    for (let j = 0; j < this.config.rows; j++) {
      for (let i = 0; i < this.config.columns - 1; i++) {
        this.swap(i, j, i + 1, j);
        this.findClusters();
        this.swap(i, j, i + 1, j);

        if (this.clusters.length > 0) {
          this.moves.push({ column1: i, row1: j, column2: i + 1, row2: j });
        }
      }
    }

    // Check vertical swaps
    for (let i = 0; i < this.config.columns; i++) {
      for (let j = 0; j < this.config.rows - 1; j++) {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.loopClusters((_index, column, row, _cluster) => {
      this.config.tile.data[column][row].type = -1;
      // console.log(indexedDB, _cluster);
    });

    for (let i = 0; i < this.config.columns; i++) {
      let shift = 0;
      for (let j = this.config.rows - 1; j >= 0; j--) {
        if (this.config.tile.data[i][j].type === -1) {
          shift++;
          this.config.tile.data[i][j].shift = 0;
        } else {
          this.config.tile.data[i][j].shift = shift;
        }
      }
    }
  }

  private shiftTiles(): void {
    for (let i = 0; i < this.config.columns; i++) {
      for (let j = this.config.rows - 1; j >= 0; j--) {
        if (this.config.tile.data[i][j].type === -1) {
          this.config.tile.data[i][j].type = this.getRandomTile();
        } else {
          const shift = this.config.tile.data[i][j].shift;
          if (shift > 0) {
            this.swap(i, j, i, j + shift);
          }
        }
        this.config.tile.data[i][j].shift = 0;
      }
    }
  }

  private getMouseTile(pos: Position): MouseTileResult {
    const tx = Math.floor((pos.x - this.config.x) / this.config.tile.width);
    const ty = Math.floor((pos.y - this.config.y) / this.config.tile.height);

    if (tx >= 0 && tx < this.config.columns && ty >= 0 && ty < this.config.rows) {
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
    const typeswap = this.config.tile.data[x1][y1].type;
    this.config.tile.data[x1][y1].type = this.config.tile.data[x2][y2].type;
    this.config.tile.data[x2][y2].type = typeswap;
  }

  private mouseSwap(c1: number, r1: number, c2: number, r2: number): void {
    this.currentMove = { column1: c1, row1: r1, column2: c2, row2: r2 };
    this.config.selected.selected = false;
    this.state.animation.state = 2;
    this.state.animation.time = 0;
    this.state.status = GameState.RESOLVE;
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(this.canvas, e);

    if (this.state.isDrag && this.config.selected.selected) {
      const mt = this.getMouseTile(pos);
      if (mt.valid) {
        if (this.canSwap(mt.x, mt.y, this.config.selected.column, this.config.selected.row)) {
          this.mouseSwap(mt.x, mt.y, this.config.selected.column, this.config.selected.row);
        }
      }
    }
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(this.canvas, e);

    if (!this.state.isDrag) {
      const mt = this.getMouseTile(pos);

      if (mt.valid) {
        let swapped = false;
        if (this.config.selected.selected) {
          if (mt.x === this.config.selected.column && mt.y === this.config.selected.row) {
            this.config.selected.selected = false;
            this.state.isDrag = true;
            return;
          } else if (
            this.canSwap(mt.x, mt.y, this.config.selected.column, this.config.selected.row)
          ) {
            this.mouseSwap(mt.x, mt.y, this.config.selected.column, this.config.selected.row);
            swapped = true;
          }
        }

        if (!swapped) {
          this.config.selected.column = mt.x;
          this.config.selected.row = mt.y;
          this.config.selected.selected = true;
        }
      } else {
        this.config.selected.selected = false;
      }

      this.state.isDrag = true;
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

  private onMouseUp(): void {
    this.state.isDrag = false;
  }

  private onMouseOut(): void {
    this.state.isDrag = false;
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

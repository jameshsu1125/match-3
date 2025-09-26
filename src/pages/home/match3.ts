import EnterFrame from 'lesca-enterframe';
import Tweener from 'lesca-object-tweener';

type TMatch3Props = {
  canvas: HTMLCanvasElement;
};

type TConfig = {
  x: number;
  y: number;
  columns: number;
  rows: number;
  tile: {
    width: number;
    height: number;
    swapDuration: number;
  };
};

type TTileDataRow = {
  type: number;
  shift: number;
}[];

type TState = {
  drag: boolean;
  status: 'init' | 'ready' | 'resolve';
  selection: { col: number; row: number; x: number; y: number; enabled: boolean };
  swapItem: {
    current: null | { col: number; row: number; x: number; y: number };
    target: null | { col: number; row: number; x: number; y: number };
  };
  score: number;
  animationState: {
    status: 0 | 1 | 2 | 3; // 0=init, 1=resolve, 2=shifting, 3=waiting
    time: number;
    total: number;
  };
};

export default class Match3 {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  tileData: TTileDataRow[] = [];
  tileColors = [
    [255, 128, 128],
    [128, 255, 128],
    [128, 128, 255],
    [255, 255, 128],
    [255, 128, 255],
    [128, 255, 255],
    [255, 255, 255],
  ];

  moveableData: any[] = [];
  clustersData: { column: number; row: number; length: number; horizontal: boolean }[] = [];

  config: TConfig = {
    x: 0, // 遊戲區域 X 座標
    y: 0, // 遊戲區域 Y 座標
    columns: 8, // 列數
    rows: 8, // 行數
    tile: {
      width: 48, // 瓦片寬度
      height: 48, // 瓦片類型
      swapDuration: 300, // 瓦片交換時間
    },
  };

  state: TState = {
    score: 0,
    status: 'init', // 遊戲狀態
    drag: false, // 是否正在拖曳
    selection: { col: -1, row: -1, enabled: false, x: 0, y: 0 }, // 選中的瓦片
    swapItem: { current: null, target: null }, // 交換中的瓦片
    animationState: {
      status: 0, // 0=init, 1=resolve, 2=shifting, 3=waiting
      time: 0,
      total: 0.3,
    },
  };

  constructor(props: TMatch3Props) {
    this.canvas = props.canvas;
    this.ctx = this.canvas.getContext('2d');

    // Initialize the game
    this.init();
    this.prepareEvent();
    EnterFrame.add(() => this.render());
    EnterFrame.play();
  }

  render() {
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.update();
    this.renderTiles();
  }

  update() {
    if (this.moveableData.length === 0) {
      // game over
      console.log('Game Over');
    }
  }

  renderTiles() {
    const { columns, rows, tile } = this.config;

    [...new Array(columns).keys()].forEach((col) =>
      [...new Array(rows).keys()].forEach((row) => {
        // let x = col * (tile.width || 48);
        // let y = row * (tile.height || 48);
        //     if (this.state.animationState.status === 'resolve') {
        //       // 交換中的瓦片
        //       if (
        //         this.state.swapItem.current?.col === col &&
        //         this.state.swapItem.current?.row === row
        //       ) {
        //         x = this.state.swapItem.current.x;
        //         y = this.state.swapItem.current.y;
        //       }
        //       if (this.state.swapItem.target?.col === col && this.state.swapItem.target?.row === row) {
        //         x = this.state.swapItem.target.x;
        //         y = this.state.swapItem.target.y;
        //       }
        //     }
        //     const type = this.tileData[col][row].type;
        //     if (type === -1) return;
        //     const color = this.tileColors[type];
        //     if (this.ctx) {
        //       this.ctx.fillStyle = `rgb(${color.join(',')})`;
        //       this.ctx.strokeStyle = '#000000';
        //       this.ctx.fillStyle = `rgba(${color.join(',')},0.8)`;
        //       this.ctx.fillRect(x, y, tile.width || 48, tile.height || 48);
        //       this.ctx.strokeRect(x, y, tile.width || 48, tile.height || 48);
        //       this.ctx.fillStyle = '#000000';
        //       this.ctx.fillText(`${col},${row}`, x + 4, y + 16);
        //     }
      }),
    );
  }

  init() {
    const { columns, rows } = this.config;

    this.config.tile.width = this.canvas.width / columns;
    this.config.tile.height = this.canvas.height / rows;

    this.tileData = [...new Array(columns).keys()].map(() =>
      [...new Array(rows).keys()].map(() => ({
        type: 0,
        shift: 0,
      })),
    );

    this.createLevel();

    // Find initial clusters and moves
    this.findMoves();
    this.findClusters();
  }

  createLevel() {
    const { columns, rows } = this.config;

    let done = false;

    // Keep generating levels until it is correct
    while (!done) {
      [...new Array(columns).keys()].forEach((col) =>
        [...new Array(rows).keys()].forEach((row) => {
          this.tileData[col][row].type = Math.floor(Math.random() * this.tileColors.length);
        }),
      );

      // Resolve the clusters
      this.resolveClusters();

      // Check if there are valid moves
      this.findMoves();

      // Done when there is a valid move
      if (this.moveableData.length > 0) {
        done = true;
      }
    }
  }

  findMoves() {
    // Reset moves
    this.moveableData = [];

    // Check horizontal swaps
    for (let j = 0; j < this.config.rows; j++) {
      for (let i = 0; i < this.config.columns - 1; i++) {
        // Swap, find clusters and swap back
        this.swapType({ col: i, row: j }, { col: i + 1, row: j });
        this.findClusters();
        this.swapType({ col: i, row: j }, { col: i + 1, row: j });

        // Check if the swap made a cluster
        if (this.clustersData.length > 0) {
          // Found a move
          this.moveableData.push({ column1: i, row1: j, column2: i + 1, row2: j });
        }
      }
    }

    // Check vertical swaps
    for (let i = 0; i < this.config.columns; i++) {
      for (let j = 0; j < this.config.rows - 1; j++) {
        // Swap, find clusters and swap back
        this.swapType({ col: i, row: j }, { col: i, row: j + 1 });
        this.findClusters();
        this.swapType({ col: i, row: j }, { col: i, row: j + 1 });

        // Check if the swap made a cluster
        if (this.clustersData.length > 0) {
          // Found a move
          this.moveableData.push({ column1: i, row1: j, column2: i, row2: j + 1 });
        }
      }
    }

    // Reset clusters
    this.clustersData = [];
  }

  shiftTiles() {
    // Shift tiles
    for (let i = 0; i < this.config.columns; i++) {
      for (let j = this.config.rows - 1; j >= 0; j--) {
        // Loop from bottom to top
        if (this.tileData[i][j].type == -1) {
          // Insert new random tile
          this.tileData[i][j].type = Math.floor(Math.random() * this.tileColors.length);
        } else {
          // Swap tile to shift it
          const shift = this.tileData[i][j].shift;
          if (shift > 0) {
            this.swapType({ col: i, row: j }, { col: i, row: j + shift });
          }
        }

        // Reset shift
        this.tileData[i][j].shift = 0;
      }
    }
  }

  resolveClusters() {
    // Check for clusters
    this.findClusters();

    // While there are clusters left
    while (this.clustersData.length > 0) {
      //   Remove clusters
      this.removeClusters();

      // Shift tiles
      this.shiftTiles();

      // Check if there are clusters left
      this.findClusters();
    }
  }

  loopClusters(func: (col: number, row: number) => void) {
    for (let i = 0; i < this.clustersData.length; i++) {
      //  { column, row, length, horizontal }
      const cluster = this.clustersData[i];
      let colOffset = 0;
      let rowOffset = 0;
      for (let j = 0; j < cluster.length; j++) {
        func(cluster.column + colOffset, cluster.row + rowOffset);
        if (cluster.horizontal) {
          colOffset++;
        } else {
          rowOffset++;
        }
      }
    }
  }

  removeClusters() {
    // Change the type of the tiles to -1, indicating a removed tile
    this.loopClusters((column, row) => {
      this.tileData[column][row].type = -1;
    });

    // Calculate how much a tile should be shifted downwards
    for (let i = 0; i < this.config.columns; i++) {
      let shift = 0;
      for (let j = this.config.rows - 1; j >= 0; j--) {
        // Loop from bottom to top
        if (this.tileData[i][j].type == -1) {
          // Tile is removed, increase shift
          shift++;
          this.tileData[i][j].shift = 0;
        } else {
          // Set the shift
          this.tileData[i][j].shift = shift;
        }
      }
    }
  }

  findClusters() {
    const { columns, rows } = this.config;
    // Reset clusters
    this.clustersData = [];

    // Find horizontal clusters
    [...new Array(rows).keys()].forEach((row) => {
      let matchLength = 1;
      [...new Array(columns).keys()].forEach((col) => {
        let checkCluster = false;
        if (col === columns - 1) {
          // 最後一個
          checkCluster = true;
        } else {
          // 檢查下一個是否相同
          if (
            this.tileData[col][row].type === this.tileData[col + 1][row].type &&
            this.tileData[col][row].type !== -1
          ) {
            matchLength += 1;
          } else {
            checkCluster = true;
          }
        }

        if (checkCluster) {
          // 檢查是否有符合條件的群集
          if (matchLength >= 3) {
            this.clustersData.push({
              column: col + 1 - matchLength,
              row,
              length: matchLength,
              horizontal: true,
            });
          }
          matchLength = 1;
        }
      });
    });

    // Find vertical clusters
    [...new Array(columns).keys()].forEach((col) => {
      let matchLength = 1;
      [...new Array(rows).keys()].forEach((row) => {
        let checkCluster = false;
        if (row === rows - 1) {
          // 最後一個
          checkCluster = true;
        } else {
          // 檢查下一個是否相同
          if (
            this.tileData[col][row].type === this.tileData[col][row + 1].type &&
            this.tileData[col][row].type !== -1
          ) {
            matchLength += 1;
          } else {
            checkCluster = true;
          }
        }

        if (checkCluster) {
          // 檢查是否有符合條件的群集
          if (matchLength >= 3) {
            this.clustersData.push({
              column: col,
              row: row + 1 - matchLength,
              length: matchLength,
              horizontal: false,
            });
          }
          matchLength = 1;
        }
      });
    });
  }

  swapType(current: { col: number; row: number }, target: { col: number; row: number }) {
    const tempType = this.tileData[current.col][current.row].type;
    this.tileData[current.col][current.row].type = this.tileData[target.col][target.row].type;
    this.tileData[target.col][target.row].type = tempType;
    this.state.selection.enabled = false;
  }

  //   swapTile(target: ReturnType<typeof this.getMouseTile>, current: typeof this.state.selection) {
  //     // 交換兩個瓦片
  //     this.state.animating = true;
  //     this.state.swapItem = { current, target };
  //     new Tweener({
  //       from: { x: current.x, y: current.y },
  //       to: { x: target.x, y: target.y },
  //       duration: this.config.tile.swapDuration || 500,
  //       onUpdate: (value: { x: number; y: number }) => {
  //         this.state.swapItem.current = { ...this.state.swapItem.current!, x: value.x, y: value.y };
  //       },
  //       onComplete: (value: { x: number; y: number }) => {
  //         this.state.swapItem.current = { ...this.state.swapItem.current!, x: value.x, y: value.y };
  //         this.state.animating = false;
  //       },
  //     }).play();

  //     new Tweener({
  //       from: { x: target.x, y: target.y },
  //       to: { x: current.x, y: current.y },
  //       duration: this.config.tile.swapDuration || 500,
  //       onUpdate: (value: { x: number; y: number }) => {
  //         this.state.swapItem.target = { ...this.state.swapItem.target!, x: value.x, y: value.y };
  //       },
  //       onComplete: (value: { x: number; y: number }) => {
  //         this.state.swapItem.target = { ...this.state.swapItem.target!, x: value.x, y: value.y };
  //         this.state.animating = false;
  //         this.swapType(this.state.swapItem.current!, this.state.swapItem.target!);
  //       },
  //     }).play();
  //   }

  onMouseMove(event: MouseEvent) {
    const { drag, selection } = this.state;

    if (drag && selection.enabled) {
      // 拖曳中
      const position = this.getMousePosition(this.canvas, event);
      const info = this.getMouseTile(position);

      if (info.valid) {
        if (this.checkSwappable(info, selection)) {
          // 可交換
          // this.swapTile(info, selection);
          this.mouseSwap(info, selection);
        }
      }
    }
  }

  mouseSwap(current: ReturnType<typeof this.getMouseTile>, target: typeof this.state.selection) {
    // Save the current move
    this.state.swapItem = { current, target };
    this.state.selection.enabled = false;

    // currentmove = { column1: c1, row1: r1, column2: c2, row2: r2 };
    // // Deselect
    // level.selectedtile.selected = false;
    // // Start animation
    // animationstate = 2;
    // animationtime = 0;
    // gamestate = gamestates.resolve;
  }

  onMouseDown(event: MouseEvent) {
    const { drag } = this.state;
    if (drag) return;
    this.state.drag = true;

    const position = this.getMousePosition(this.canvas, event);
    const info = this.getMouseTile(position);

    if (info.valid) {
      let swapped = false;
      if (this.state.selection.enabled) {
        if (info.col === this.state.selection.col && info.row === this.state.selection.row) {
          // 點擊同一個格子，取消互動
          this.state.selection.enabled = false;
          return;
        } else if (this.checkSwappable(info, this.state.selection)) {
          // 可交換
          swapped = true;
        }
      }
      if (!swapped) {
        // 選中格子
        this.state.selection = { ...info, enabled: true };
      }
    } else {
      // 點擊遊戲區域外，取消互動
      this.state.selection.enabled = false;
    }
  }

  onMouseUp() {
    this.state.drag = false;
  }

  onMouseOut() {
    this.state.drag = false;
  }

  checkSwappable(current: { col: number; row: number }, target: { col: number; row: number }) {
    return (
      (Math.abs(current.col - target.col) == 1 && current.row == target.row) ||
      (Math.abs(current.row - target.row) == 1 && current.col == target.col)
    );
  }

  getMouseTile(position: { x: number; y: number }) {
    const { x, y, columns, rows, tile } = this.config;

    const col = Math.floor((position.x - x) / tile.width);
    const row = Math.floor((position.y - y) / tile.height);

    const tileX = x + col * tile.width;
    const tileY = y + row * tile.height;

    if (row >= 0 && row < columns && col >= 0 && col < rows) {
      return { valid: true, row, col, x: tileX, y: tileY };
    }
    return { valid: false, row: 0, col: 0, x: 0, y: 0 };
  }

  getMousePosition(canvas: HTMLCanvasElement, e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / (rect.right - rect.left)) * canvas.width),
      y: Math.round(((e.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height),
    };
  }

  prepareEvent() {
    if (this.canvas) {
      this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
      this.canvas.addEventListener('mouseout', this.onMouseOut.bind(this));
    }
  }
}

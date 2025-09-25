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
}[];

type TState = {
  drag: boolean;
  animating: boolean;
  selection: { col: number; row: number; x: number; y: number; enabled: boolean };
  swapItem: {
    current: null | { col: number; row: number; x: number; y: number };
    target: null | { col: number; row: number; x: number; y: number };
  };
};

export default class Match3 {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;

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

  state: TState = {
    drag: false, // 是否正在拖曳
    animating: false, // 是否正在動畫
    selection: { col: -1, row: -1, enabled: false, x: 0, y: 0 }, // 選中的瓦片
    swapItem: { current: null, target: null }, // 交換中的瓦片
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
    this.renderTiles();
  }

  renderTiles() {
    const { columns, rows, tile } = this.config;

    [...new Array(columns).keys()].forEach((col) =>
      [...new Array(rows).keys()].forEach((row) => {
        let x = col * (tile.width || 48);
        let y = row * (tile.height || 48);

        if (this.state.animating) {
          // 交換中的瓦片

          if (
            this.state.swapItem.current?.col === col &&
            this.state.swapItem.current?.row === row
          ) {
            x = this.state.swapItem.current.x;
            y = this.state.swapItem.current.y;
          }
          if (this.state.swapItem.target?.col === col && this.state.swapItem.target?.row === row) {
            x = this.state.swapItem.target.x;
            y = this.state.swapItem.target.y;
          }
        }

        const type = this.tileData[col][row].type;
        const color = this.tileColors[type];
        if (this.ctx) {
          this.ctx.fillStyle = `rgb(${color.join(',')})`;
          this.ctx.strokeStyle = '#000000';
          this.ctx.fillStyle = `rgba(${color.join(',')},0.8)`;
          this.ctx.fillRect(x, y, tile.width || 48, tile.height || 48);
          this.ctx.strokeRect(x, y, tile.width || 48, tile.height || 48);
          this.ctx.fillStyle = '#000000';
          this.ctx.fillText(`${col},${row}`, x + 4, y + 16);
        }
      }),
    );
  }

  init() {
    const { columns, rows } = this.config;

    this.config.tile.width = this.canvas.width / columns;
    this.config.tile.height = this.canvas.height / rows;

    this.tileData = [...new Array(columns).keys()].map(() =>
      [...new Array(rows).keys()].map(() => ({
        type: Math.floor(Math.random() * this.tileColors.length),
        shift: 0,
      })),
    );
  }

  swapTile(target: ReturnType<typeof this.getMouseTile>, current: typeof this.state.selection) {
    // 交換兩個瓦片
    this.state.animating = true;
    this.state.swapItem = { current, target };
    new Tweener({
      from: { x: current.x, y: current.y },
      to: { x: target.x, y: target.y },
      duration: this.config.tile.swapDuration || 500,
      onUpdate: (value: { x: number; y: number }) => {
        this.state.swapItem.current = { ...this.state.swapItem.current!, x: value.x, y: value.y };
      },
      onComplete: (value: { x: number; y: number }) => {
        this.state.swapItem.current = { ...this.state.swapItem.current!, x: value.x, y: value.y };
        this.state.animating = false;
      },
    }).play();

    new Tweener({
      from: { x: target.x, y: target.y },
      to: { x: current.x, y: current.y },
      duration: this.config.tile.swapDuration || 500,
      onUpdate: (value: { x: number; y: number }) => {
        this.state.swapItem.target = { ...this.state.swapItem.target!, x: value.x, y: value.y };
      },
      onComplete: (value: { x: number; y: number }) => {
        this.state.swapItem.target = { ...this.state.swapItem.target!, x: value.x, y: value.y };
        this.state.animating = false;
        this.swap(this.state.swapItem.current!, this.state.swapItem.target!);
      },
    }).play();
  }

  onMouseMove(event: MouseEvent) {
    const { drag, selection, animating } = this.state;

    if (drag && selection.enabled) {
      // 拖曳中
      const position = this.getMousePosition(this.canvas, event);
      const info = this.getMouseTile(position);

      if (info.valid) {
        if (this.checkSwappable(info, selection) && !animating) {
          // 可交換
          this.swapTile(info, selection);
        }
      }
    }
  }

  onMouseDown(event: MouseEvent) {
    const { drag, animating } = this.state;
    if (drag || animating) return;
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

  swap(current: { col: number; row: number }, target: { col: number; row: number }) {
    const tempType = this.tileData[current.col][current.row].type;
    this.tileData[current.col][current.row].type = this.tileData[target.col][target.row].type;
    this.tileData[target.col][target.row].type = tempType;
    this.state.selection.enabled = false;
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

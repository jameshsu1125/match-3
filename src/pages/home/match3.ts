import EnterFrame from 'lesca-enterframe';

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
  };
};

type TTileDataRow = {
  type: number;
  shift: number;
}[];

export default class Match3 {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;

  config: TConfig = {
    x: 0,
    y: 0,
    columns: 8,
    rows: 8,
    tile: {
      width: 48,
      height: 48,
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

    [...new Array(columns * rows).keys()].map((index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = col * (tile.width || 48);
      const y = row * (tile.height || 48);
    });
  }

  getTileCoordinate(column: number, row: number, columnOffset: number, rowOffset: number) {
    const { x, y } = this.config;
    const currentX = x + (column + columnOffset) * (this.config.tile.width || 48);
    const currentY = y + (row + rowOffset) * (this.config.tile.height || 48);
    return { x: currentX, y: currentY };
  }

  init() {
    const { columns, rows } = this.config;

    this.config.tile.width = this.canvas.width / columns;
    this.config.tile.height = this.canvas.height / rows;

    this.tileData = [...new Array(columns).keys()].map(() =>
      [...new Array(rows).keys()].map(() => ({ type: 0, shift: 0 })),
    );
  }

  onMouseMove(event: MouseEvent) {}

  onMouseDown(event: MouseEvent) {}

  onMouseUp(event: MouseEvent) {}

  onMouseOut() {}

  prepareEvent() {
    if (this.canvas) {
      this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
      this.canvas.addEventListener('mouseout', this.onMouseOut.bind(this));
    }
  }
}

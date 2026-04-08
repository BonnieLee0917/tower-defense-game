// Map 2: "Forest Path" — S-curve through forest, wider build areas
import { MapData } from './map1';

function generatePathTiles(waypoints: { x: number; y: number }[]): { col: number; row: number }[] {
  const tiles = new Set<string>();
  const TILE = 64;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const ax = waypoints[i].x, ay = waypoints[i].y;
    const bx = waypoints[i + 1].x, by = waypoints[i + 1].y;
    const dist = Math.hypot(bx - ax, by - ay);
    const steps = Math.ceil(dist / 16);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      tiles.add(`${Math.floor(px / TILE)},${Math.floor(py / TILE)}`);
    }
  }
  return Array.from(tiles).map(k => {
    const [c, r] = k.split(',').map(Number);
    return { col: c, row: r };
  });
}

// S-curve path: enters left, curves up-right, down-right, exits right
const waypoints = [
  { x: 0, y: 352 },
  { x: 224, y: 352 },
  { x: 224, y: 128 },
  { x: 544, y: 128 },
  { x: 544, y: 544 },
  { x: 864, y: 544 },
  { x: 864, y: 224 },
  { x: 1088, y: 224 },
  { x: 1088, y: 480 },
  { x: 1280, y: 480 },
];

export const MAP2_DATA: MapData = {
  waypoints,
  buildSpots: [
    // Along the S-curve, 72px from path
    { x: 152, y: 224 },
    { x: 296, y: 224 },
    { x: 384, y: 200 },
    { x: 384, y: 480 },
    { x: 472, y: 352 },
    { x: 616, y: 472 },
    { x: 616, y: 616 },
    { x: 792, y: 352 },
    { x: 936, y: 152 },
    { x: 936, y: 352 },
    { x: 1016, y: 352 },
    { x: 1160, y: 352 },
  ],
  cols: 20,
  rows: 11,
  pathTiles: generatePathTiles(waypoints),
};

export function latLonToScene(
  lat: number,
  lon: number,
  extent: { lat_min: number; lat_max: number; lon_min: number; lon_max: number },
  sceneWidth: number = 10,
  sceneHeight: number = 8,
  depth: number = 0,
  verticalExaggeration: number = 1,
  maxDepth: number = 1000
): [number, number, number] {
  // Guard against division by zero
  const latRange = Math.max(extent.lat_max - extent.lat_min, 0.001);
  const lonRange = Math.max(extent.lon_max - extent.lon_min, 0.001);

  // Map lon to X (left to right: -sceneWidth/2 to sceneWidth/2)
  const x = ((lon - extent.lon_min) / lonRange) * sceneWidth - (sceneWidth / 2);
  
  // Map lat to Z (bottom to top: sceneHeight/2 to -sceneHeight/2)
  // Original mapping was: ((lat - min) / range) * H - H/2
  const z = ((lat - extent.lat_min) / latRange) * sceneHeight - (sceneHeight / 2);
  
  // Map depth to Y
  const y = -(depth / maxDepth) * 5 * (verticalExaggeration / 5);

  return [x, y, z];
}

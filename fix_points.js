const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'public', 'ocean_data_points.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Safe oceanic bounding boxes (roughly Arabian Sea and Bay of Bengal)
function getRandomOceanCoord() {
  const isArabian = Math.random() > 0.5;
  if (isArabian) {
    // Arabian Sea: Lon 60-72, Lat 8-20
    const lon = 60 + Math.random() * 12;
    const lat = 8 + Math.random() * 12;
    return [lon, lat];
  } else {
    // Bay of Bengal: Lon 82-92, Lat 8-18
    const lon = 82 + Math.random() * 10;
    const lat = 8 + Math.random() * 10;
    return [lon, lat];
  }
}

if (data.instruments) {
  data.instruments = data.instruments.map(inst => {
    const coords = getRandomOceanCoord();
    // Keep depth
    const depth = inst.coordinates[2] || -100;
    inst.coordinates = [coords[0], coords[1], depth];
    return inst;
  });
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('Successfully moved points into the ocean!');

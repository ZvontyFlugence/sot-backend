import db from './dbService';
import CountryService from './countryService';

const RegionService = {};

// DEVELOPMENT ONLY
RegionService.createRegion = async data => {
  const regions = db.getDB().collection('regions');

  let region_doc = {
    _id: await regions.estimatedDocumentCount() + 1,
    name: data.name,
    owner: data.owner,
    core: data.core,
    resource: 0,
    neighbors: [],
  };

  if (!data.type) {
    region_doc['borders'] = data.borders.map(path => ({ lat: path[0], lng: path[1] }));
  } else {
    region_doc['type'] = data.type;
    region_doc['borders'] = data.borders.map(geom => {
      return geom.map(path => ({ lat: path[0], lng: path[1] }));
    });
  }

  return await regions.insertOne(region_doc);
};

RegionService.getRegion = async id => {
  const regions = db.getDB().collection('regions');
  let region = await regions.findOne({ _id: id });
  let core = await CountryService.getCountry(region.core);
  let owner = await CountryService.getCountry(region.owner);

  region.core = { _id: core._id, name: core.name, flag: core.flag_code };
  region.owner = { _id: owner._id, name: owner.name, flag: owner.flag_code };

  return region;
};

RegionService.getAllRegions = async () => {
  const regions = db.getDB().collection('regions');
  let region_list = await regions.find({}).toArray();

  region_list = await Promise.all(region_list.map(async region => {
    region.owner = await CountryService.getCountry(region.owner);
    return region;
  }));

  return region_list;
};

RegionService.startingRegion = async country_id => {
  const regions = db.getDB().collection('regions');
  let region_list = await regions.find({ owner: country_id }).toArray();

  const index = Math.floor(Math.random() * region_list.length);

  return region_list[index];
};

// DEVELOPMENT ONLY
RegionService.updateNeighbors = async data => {
  const regions = db.getDB().collection('regions');
  let region = await regions.findOne({ name: data.region });
  data.neighbors.sort();
  let neighbors = await Promise.all(data.neighbors.map(async regionName => {
    let r = await regions.findOne({ name: regionName }, { projection: { '_id': 1 } });
  }));

  let updated = await regions.findOneAndUpdate({ _id: region._id }, { $set: { neighbors } });

  if (updated) {
    return Promise.resolve({ status: 200, payload: { updated: true } });
  }
  return Promise.resolve({ status: 500, payload: { updated: false } });
};

RegionService.getDistance = async (src, dest) => {
  const regions = await RegionService.getAllRegions();
  let nodes = createNodes(regions);
  let _visited = dijkstras(nodes, nodes[src], nodes[dest]);
  let shortestPath = getShortestPath(nodes[dest]);

  const distance = shortestPath.length - 1;
  const cost = Number.parseFloat(Math.log10(distance).toFixed(2));

  return Promise.resolve({
    from: regions[src],
    to: regions[dest],
    path: shortestPath,
    distance,
    cost,
  });
};

const createNodes = regions => {
  return regions.map(region => {
    region.distance = Infinity;
    region.visited = false;
    region.previous = null;
    region.borders = undefined;
    return region;
  });
};

const dijkstras = (nodes, srcNode, destNode) => {
  let visited = [];
  srcNode.distance = 0;
  let unvisited = getAllNodes(nodes);
  let shortestDistance = Infinity;

  while (!!unvisited.length) {
    sortNodesByDistance(unvisited);
    let closest = getClosestNode(unvisited, destNode);

    if (closest.distance === Infinity)
      return visited;
    else if (closest.distance > shortestDistance)
      continue;
    else if (closest.distance === shortestDistance && closest._id === destNode._id)
      return visited;

    if (closest.neighbors.includes(destNode._id)) {
      destNode.distance = closest.distance + 1;
      destNode.previous = closest;
      shortestDistance = destNode.distance;
    }

    closest.visited = true;
    visited.push(closest);

    if (closest._id === destNode._id)
      shortestDistance = closest.distance;

    updateNeighbors(closest, nodes, unvisited);
  }

  return visited;
};

const getAllNodes = nodes => {
  let node_list = [];

  for (const node of nodes) {
    node_list.push(node);
  }

  return node_list;
};

const sortNodesByDistance = nodes => {
  nodes.sort((a, b) => a.distance - b.distance);
};

const getClosestNode = (nodes, destNode) => {
  let distance = nodes[0].distance;

  if (destNode.distance === distance)
    return destNode;
  else
    return nodes.shift();
};

const updateNeighbors = (node, nodes, unvisited) => {
  let neighbors = getNeighborNodes(node, nodes, unvisited);

  for (let neighbor of neighbors) {
    if (neighbor.distance > node.distance + 1) {
      neighbor.distance = node.distance + 1;
      neighbor.previous = node;
    }
  }
};

const getNeighborNodes = (node, nodes, unvisited) => {
  let neighbors = [];

  for (let neighbor of neighbors) {
    if (nodes[neighbor-1]) {
      let neighborNode = nodes[neighbor-1];
      if (neighborNode.visited && neighborNode.distance > node.distance + 1) {
        neighborNode.visited = false;
        unvisited.push(neighborNode);
      }
      neighbors.push(neighborNode);
    }
  }

  return neighbors.filter(n => !n.visited);
};

const getShortestPath = destNode => {
  let shortestPath = [];
  let currNode = destNode;

  while (currNode !== null) {
    shortestPath.unshift(currNode);
    currNode = currNode.previous;
  }

  return shortestPath;
};

export default RegionService;
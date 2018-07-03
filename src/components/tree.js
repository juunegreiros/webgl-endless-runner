import * as THREE from 'three';

export const createTreesPool = treesPool => {
  let maxTreesInPool = 10;
  let newTree;
  for (let i = 0; i < maxTreesInPool; i++) {
    newTree = createTree();
    treesPool.push(newTree);
  }
};

export const addTree = (
  inPath,
  row,
  isLeft,
  treesPool,
  treesInPath,
  sphericalHelper,
  worldRadius,
  pathAngleValues,
  rollingGroundSphere
) => {
  let newTree;
  if (inPath) {
    if (treesPool.length === 0) return;
    newTree = treesPool.pop();
    newTree.visible = true;
    treesInPath.push(newTree);
    sphericalHelper.set(
      worldRadius - 0.3,
      pathAngleValues[row],
      -rollingGroundSphere.rotation.x + 4
    );
  } else {
    newTree = createTree();
    let forestAreaAngle = 0;
    if (isLeft) {
      forestAreaAngle = 1.68 + Math.random() * 0.1;
    } else {
      forestAreaAngle = 1.46 - Math.random() * 0.1;
    }
    sphericalHelper.set(worldRadius - 0.3, forestAreaAngle, row);
  }
  newTree.position.setFromSpherical(sphericalHelper);
  let rollingGroundVector = rollingGroundSphere.position.clone().normalize();
  let treeVector = newTree.position.clone().normalize();
  newTree.quaternion.setFromUnitVectors(treeVector, rollingGroundVector);
  newTree.rotation.x += Math.random() * (2 * Math.PI / 10) + -Math.PI / 10;

  rollingGroundSphere.add(newTree);
};

export const createTree = () => {
  let sides = 8;
  let tiers = 6;
  let scalarMultiplier = Math.random() * (0.25 - 0.1) + 0.05;
  let midPointVector = new THREE.Vector3();
  let vertexVector = new THREE.Vector3();
  let treeGeometry = new THREE.ConeGeometry(0.5, 1, sides, tiers);
  let treeMaterial = new THREE.MeshStandardMaterial({
    color: 0x33ff33,
    shading: THREE.FlatShading,
  });
  midPointVector = treeGeometry.vertices[0].clone();
  blowUpTree(treeGeometry.vertices, sides, 0, scalarMultiplier);
  tightenTree(treeGeometry.vertices, sides, 1);
  blowUpTree(treeGeometry.vertices, sides, 2, scalarMultiplier * 1.1, true);
  tightenTree(treeGeometry.vertices, sides, 3);
  blowUpTree(treeGeometry.vertices, sides, 4, scalarMultiplier * 1.2);
  tightenTree(treeGeometry.vertices, sides, 5);
  let treeTop = new THREE.Mesh(treeGeometry, treeMaterial);
  treeTop.castShadow = true;
  treeTop.receiveShadow = false;
  treeTop.position.y = 0.9;
  treeTop.rotation.y = Math.random() * Math.PI;
  let treeTrunkGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5);
  let trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x886633,
    shading: THREE.FlatShading,
  });
  let treeTrunk = new THREE.Mesh(treeTrunkGeometry, trunkMaterial);
  treeTrunk.position.y = 0.25;
  let tree = new THREE.Object3D();
  tree.add(treeTrunk);
  tree.add(treeTop);
  return tree;
};

const blowUpTree = (vertices, sides, currentTier, scalarMultiplier, odd) => {
  let vertexIndex;
  let vertexVector = new THREE.Vector3();
  let midPointVector = vertices[0].clone();
  let offset;
  for (let i = 0; i < sides; i++) {
    vertexIndex = currentTier * sides + 1;
    vertexVector = vertices[i + vertexIndex].clone();
    midPointVector.y = vertexVector.y;
    offset = vertexVector.sub(midPointVector);
    if (odd) {
      if (i % 2 === 0) {
        offset.normalize().multiplyScalar(scalarMultiplier / 6);
        vertices[i + vertexIndex].add(offset);
      } else {
        offset.normalize().multiplyScalar(scalarMultiplier);
        vertices[i + vertexIndex].add(offset);
        vertices[i + vertexIndex].y =
          vertices[i + vertexIndex + sides].y + 0.05;
      }
    } else {
      if (i % 2 !== 0) {
        offset.normalize().multiplyScalar(scalarMultiplier / 6);
        vertices[i + vertexIndex].add(offset);
      } else {
        offset.normalize().multiplyScalar(scalarMultiplier);
        vertices[i + vertexIndex].add(offset);
        vertices[i + vertexIndex].y =
          vertices[i + vertexIndex + sides].y + 0.05;
      }
    }
  }
};

const tightenTree = (vertices, sides, currentTier) => {
  let vertexIndex;
  let vertexVector = new THREE.Vector3();
  let midPointVector = vertices[0].clone();
  let offset;
  for (let i = 0; i < sides; i++) {
    vertexIndex = currentTier * sides + 1;
    vertexVector = vertices[i + vertexIndex].clone();
    midPointVector.y = vertexVector.y;
    offset = vertexVector.sub(midPointVector);
    offset.normalize().multiplyScalar(0.06);
    vertices[i + vertexIndex].sub(offset);
  }
};

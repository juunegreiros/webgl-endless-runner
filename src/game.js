import * as THREE from 'three';

let sceneWidth = window.innerWidth;
let sceneHeight = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  sceneWidth / sceneHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ alpha: true });
const dom = document.getElementById('container');
const scoreText = document.createElement('div');
const sphericalHelper = new THREE.Spherical();
const clock = new THREE.Clock();

let hasCollided = false;
let score = 0;
let treesInPath = [];
let treesPool = [];
let rollingSpeed = 0.008;
let worldRadius = 26;
let heroRadius = 0.2;
let heroRollingSpeed = rollingSpeed * worldRadius / heroRadius / 5;
let pathAngleValues = [1.52, 1.57, 1.62];
let rollingGroundSphere;
let jumping = false;
let heroSphere;
let heroBaseY = 1.8;
let middleLane = 0;
let currentLane;
let sun;
let particleGeometry;
let particleCount = 20;
let particles;
let leftLane = -1;
let rightLane = 1;
let bounceValue = 0.1;
let gravity = 0.005;
let treeReleaseInterval = 0.5;
let explosionPower = 1.06;

const createScene = () => {
  clock.start();

  scene.fog = new THREE.FogExp2(0xf0fff0, 0.14);

  renderer.setClearColor(0xfffafa, 1);
  renderer.shadowMap.enabled = true; //enable shadow
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(sceneWidth, sceneHeight);

  dom.appendChild(renderer.domElement);

  createTreesPool();
  addWorld();
  addHero();
  addLight();
  addExplosion();

  camera.position.z = 6.5;
  camera.position.y = 2.5;

  window.addEventListener('resize', onWindowResize, false);

  document.onkeydown = handleKeyDown;

  scoreText.style.position = 'absolute';
  scoreText.style.width = 100;
  scoreText.style.height = 100;
  scoreText.innerHTML = '0';
  scoreText.style.top = 50 + 'px';
  scoreText.style.left = 10 + 'px';
  document.body.appendChild(scoreText);
};

const createTreesPool = () => {
  let maxTreesInPool = 10;
  let newTree;
  for (let i = 0; i < maxTreesInPool; i++) {
    newTree = createTree();
    treesPool.push(newTree);
  }
};

const createTree = () => {
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
  let offset;
  midPointVector = treeGeometry.vertices[0].clone();
  let currentTier = 0;
  let vertexIndex;
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

const addWorld = () => {
  let sides = 40;
  let tiers = 40;
  let sphereGeometry = new THREE.SphereGeometry(worldRadius, sides, tiers);
  let sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xfffafa,
    shading: THREE.FlatShading,
  });
  let vertexIndex;
  let vertexVector = new THREE.Vector3();
  let nextVertexVector = new THREE.Vector3();
  let firstVertexVector = new THREE.Vector3();
  let offset = new THREE.Vector3();
  let currentTier = 1;
  let lerpValue = 0.5;
  let heightValue;
  let maxHeight = 0.07;

  for (let j = 1; j < tiers - 2; j++) {
    currentTier = j;
    for (let i = 0; i < sides; i++) {
      vertexIndex = currentTier * sides + 1;
      vertexVector = sphereGeometry.vertices[i + vertexIndex].clone();
      if (j % 2 !== 0) {
        if (i === 0) {
          firstVertexVector = vertexVector.clone();
        }
        nextVertexVector = sphereGeometry.vertices[i + vertexIndex + 1].clone();
        if (i === sides - 1) {
          nextVertexVector = firstVertexVector;
        }
        lerpValue = Math.random() * (0.75 - 0.25) + 0.25;
        vertexVector.lerp(nextVertexVector, lerpValue);
      }
      heightValue = Math.random() * maxHeight - maxHeight / 2;
      offset = vertexVector
        .clone()
        .normalize()
        .multiplyScalar(heightValue);
      sphereGeometry.vertices[i + vertexIndex] = vertexVector.add(offset);
    }
  }

  rollingGroundSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  rollingGroundSphere.receiveShadow = true;
  rollingGroundSphere.castShadow = false;
  rollingGroundSphere.rotation.z = -Math.PI / 2;
  scene.add(rollingGroundSphere);
  rollingGroundSphere.position.y = -24;
  rollingGroundSphere.position.z = 2;
  addWorldTrees();
};

const addWorldTrees = () => {
  let numTrees = 36;
  let gap = 6.28 / 36;
  for (let i = 0; i < numTrees; i++) {
    addTree(false, i * gap, true);
    addTree(false, i * gap, false);
  }
};

const addTree = (inPath, row, isLeft) => {
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

const addHero = () => {
  let sphereGeometry = new THREE.DodecahedronGeometry(heroRadius, 1);
  let sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xe5f2f2,
    shading: THREE.FlatShading,
  });

  heroSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  heroSphere.receiveShadow = true;
  heroSphere.castShadow = true;
  scene.add(heroSphere);
  heroSphere.position.y = heroBaseY;
  heroSphere.position.z = 4.8;
  currentLane = middleLane;
  heroSphere.position.x = currentLane;
};

const addLight = () => {
  let hemisphereLight = new THREE.HemisphereLight(0xfffafa, 0x000000, 0.9);
  scene.add(hemisphereLight);
  sun = new THREE.DirectionalLight(0xcdc1c5, 0.9);
  sun.position.set(12, 6, -7);
  sun.castShadow = true;
  scene.add(sun);
  sun.shadow.mapSize.width = 256;
  sun.shadow.mapSize.height = 256;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 50;
};

const addExplosion = () => {
  particleGeometry = new THREE.Geometry();
  for (let i = 0; i < particleCount; i++) {
    let vertex = new THREE.Vector3();
    particleGeometry.vertices.push(vertex);
  }
  let pMaterial = new THREE.ParticleBasicMaterial({
    color: 0xfffafa,
    size: 0.2,
  });
  particles = new THREE.Points(particleGeometry, pMaterial);
  scene.add(particles);
  particles.visible = false;
};

const onWindowResize = () => {
  sceneHeight = window.innerHeight;
  sceneWidth = window.innerWidth;
  renderer.setSize(sceneWidth, sceneHeight);
  camera.aspect = sceneWidth / sceneHeight;
  camera.updateProjectionMatrix();
};

const handleKeyDown = keyEvent => {
  if (jumping) return;
  let validMove = true;
  if (keyEvent.keyCode === 37) {
    if (currentLane === middleLane) {
      currentLane = leftLane;
    } else if (currentLane === rightLane) {
      currentLane = middleLane;
    } else {
      validMove = false;
    }
  } else if (keyEvent.keyCode === 39) {
    if (currentLane === middleLane) {
      currentLane = rightLane;
    } else if (currentLane == leftLane) {
      currentLane = middleLane;
    } else {
      validMove = false;
    }
  } else {
    if (keyEvent.keyCode === 38) {
      bounceValue = 0.1;
      jumping = true;
    }
    validMove = false;
  }
  if (validMove) {
    jumping = true;
    bounceValue = 0.06;
  }
};

const update = () => {
  rollingGroundSphere.rotation.x += rollingSpeed;
  heroSphere.rotation.x -= heroRollingSpeed;
  if (heroSphere.position.y <= heroBaseY) {
    jumping = false;
    bounceValue = Math.random() * 0.04 + 0.005;
  }
  heroSphere.position.y += bounceValue;
  heroSphere.position.x = THREE.Math.lerp(
    heroSphere.position.x,
    currentLane,
    2 * clock.getDelta()
  );
  bounceValue -= gravity;
  if (clock.getElapsedTime() > treeReleaseInterval) {
    clock.start();
    addPathTree();
    if (!hasCollided) {
      score += 2 * treeReleaseInterval;
      scoreText.innerHTML = score.toString();
    }
  }
  doTreeLogic();
  doExplosionLogic();
  render();
  requestAnimationFrame(update);
};

const addPathTree = () => {
  let options = [0, 1, 2];
  let lane = Math.floor(Math.random() * 3);
  addTree(true, lane);
  options.splice(lane, 1);
  if (Math.random() > 0.5) {
    lane = Math.floor(Math.random() * 2);
    addTree(true, options[lane]);
  }
};

const doTreeLogic = () => {
  let oneTree;
  let treePos = new THREE.Vector3();
  let treesToRemove = [];
  treesInPath.forEach(function(element, index) {
    oneTree = treesInPath[index];
    treePos.setFromMatrixPosition(oneTree.matrixWorld);
    if (treePos.z > 6 && oneTree.visible) {
      //gone out of our view zone
      treesToRemove.push(oneTree);
    } else {
      if (treePos.distanceTo(heroSphere.position) <= 0.6) {
        console.log('hit');
        hasCollided = true;
        explode();
      }
    }
  });
  let fromWhere;
  treesToRemove.forEach(function(element, index) {
    oneTree = treesToRemove[index];
    fromWhere = treesInPath.indexOf(oneTree);
    treesInPath.splice(fromWhere, 1);
    treesPool.push(oneTree);
    oneTree.visible = false;
    console.log('remove tree');
  });
};

const explode = () => {
  particles.position.y = 2;
  particles.position.z = 4.8;
  particles.position.x = heroSphere.position.x;
  for (var i = 0; i < particleCount; i++) {
    var vertex = new THREE.Vector3();
    vertex.x = -0.2 + Math.random() * 0.4;
    vertex.y = -0.2 + Math.random() * 0.4;
    vertex.z = -0.2 + Math.random() * 0.4;
    particleGeometry.vertices[i] = vertex;
  }
  explosionPower = 1.07;
  particles.visible = true;
};

const doExplosionLogic = () => {
  if (!particles.visible) return;
  for (let i = 0; i < particleCount; i++) {
    particleGeometry.vertices[i].multiplyScalar(explosionPower);
  }
  if (explosionPower > 1.005) {
    explosionPower -= 0.001;
  } else {
    particles.visible = false;
  }
  particleGeometry.verticesNeedUpdate = true;
};

const render = () => {
  renderer.render(scene, camera);
};

export default () => {
  createScene();

  update();
};

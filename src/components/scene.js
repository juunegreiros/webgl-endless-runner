import * as THREE from 'three';
import { createTreesPool } from './tree.js';

export default (
  clock,
  scene,
  renderer,
  dom,
  camera,
  scoreText,
  treesPool,
  addWorld,
  addHero,
  addLight,
  addExplosion,
  onWindowResize,
  handleKeyDown,
  sceneWidth,
  sceneHeight
) => {
  clock.start();

  scene.fog = new THREE.FogExp2(0xf0fff0, 0.14);

  renderer.setClearColor(0xfffafa, 1);
  renderer.shadowMap.enabled = true; //enable shadow
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(sceneWidth, sceneHeight);

  dom.appendChild(renderer.domElement);

  createTreesPool(treesPool);
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

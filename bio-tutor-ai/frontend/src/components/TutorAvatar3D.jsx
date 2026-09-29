import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function makeMaterial(color, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

function addMesh(parent, geometry, material, position, scale) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeCharacter(scene) {
  const colors = {
    skin: makeMaterial("#ffd8c5"),
    skinShade: makeMaterial("#e9aa9a"),
    hair: makeMaterial("#534477", 0.54),
    hairLight: makeMaterial("#8170ad", 0.5),
    jacket: makeMaterial("#f374a0", 0.58),
    jacketLight: makeMaterial("#ff9fbd", 0.56),
    shirt: makeMaterial("#fff8fb", 0.48),
    tie: makeMaterial("#806bb2", 0.5),
    shoe: makeMaterial("#51436f", 0.55),
    eyeWhite: makeMaterial("#ffffff", 0.35),
    iris: makeMaterial("#4d7198", 0.38),
    pupil: makeMaterial("#26334e", 0.34),
    mouth: makeMaterial("#a64d6a", 0.55),
    gold: makeMaterial("#f4c965", 0.42),
    book: makeMaterial("#fffdfd", 0.52),
    bookCover: makeMaterial("#d97da6", 0.52),
  };

  const character = new THREE.Group();
  scene.add(character);

  const sphere = new THREE.SphereGeometry(1, 24, 18);
  const capsule = (radius, length) => new THREE.CapsuleGeometry(radius, length, 5, 12);

  // Soft contact shadow and a little floating platform keep the character grounded.
  const platform = addMesh(character, new THREE.CylinderGeometry(0.72, 0.82, 0.09, 48), makeMaterial("#eadff3"), [0, 0.06, 0]);
  platform.castShadow = false;
  const platformTop = addMesh(character, new THREE.CylinderGeometry(0.68, 0.68, 0.025, 48), makeMaterial("#fff8fc"), [0, 0.115, 0]);
  platformTop.castShadow = false;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.70, 0.018, 8, 48), makeMaterial("#e990b2", 0.48));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.13;
  character.add(ring);

  // Legs and shoes.
  addMesh(character, capsule(0.12, 0.38), colors.skin, [-0.19, 0.43, 0.02], [0.76, 0.9, 0.78]);
  addMesh(character, capsule(0.12, 0.38), colors.skin, [0.19, 0.43, 0.02], [0.76, 0.9, 0.78]);
  addMesh(character, sphere, colors.shoe, [-0.21, 0.27, 0.15], [0.19, 0.11, 0.29]);
  addMesh(character, sphere, colors.shoe, [0.21, 0.27, 0.15], [0.19, 0.11, 0.29]);
  addMesh(character, sphere, colors.gold, [-0.21, 0.275, 0.41], [0.035, 0.025, 0.018]);
  addMesh(character, sphere, colors.gold, [0.21, 0.275, 0.41], [0.035, 0.025, 0.018]);

  // School jacket, blouse, collar, and tie.
  addMesh(character, capsule(0.39, 0.70), colors.jacket, [0, 1.28, 0], [1.02, 1.0, 0.9]);
  addMesh(character, capsule(0.19, 0.55), colors.shirt, [0, 1.35, 0.29], [0.93, 0.96, 0.48]);
  addMesh(character, new THREE.ConeGeometry(0.14, 0.23, 3), colors.shirt, [-0.12, 1.73, 0.43], [1, 0.8, 0.28]);
  addMesh(character, new THREE.ConeGeometry(0.14, 0.23, 3), colors.shirt, [0.12, 1.73, 0.43], [1, 0.8, 0.28]);
  const tie = addMesh(character, new THREE.ConeGeometry(0.115, 0.48, 4), colors.tie, [0, 1.43, 0.47]);
  tie.rotation.x = Math.PI;
  addMesh(character, sphere, colors.gold, [0, 1.63, 0.50], [0.055, 0.055, 0.03]);
  addMesh(character, new THREE.CylinderGeometry(0.10, 0.11, 0.22, 18), colors.skin, [0, 1.84, 0]);

  // Arms are separate pivot groups so the tutor can gesture while speaking.
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.36, 1.66, 0.03);
  character.add(leftArm);
  addMesh(leftArm, capsule(0.13, 0.36), colors.jacketLight, [-0.08, -0.24, 0.02], [0.88, 1.0, 0.9]);
  addMesh(leftArm, sphere, colors.skin, [-0.16, -0.48, 0.06], [0.12, 0.12, 0.12]);
  leftArm.rotation.z = 0.28;

  const rightArm = new THREE.Group();
  rightArm.position.set(0.36, 1.66, 0.03);
  character.add(rightArm);
  addMesh(rightArm, capsule(0.13, 0.36), colors.jacketLight, [0.10, -0.22, 0.02], [0.88, 1.0, 0.9]);
  addMesh(rightArm, sphere, colors.skin, [0.20, -0.46, 0.08], [0.12, 0.12, 0.12]);
  rightArm.rotation.z = -0.50;

  // Open book in the tutor's hand.
  const bookGroup = new THREE.Group();
  bookGroup.position.set(0.64, 1.03, 0.22);
  bookGroup.rotation.z = -0.12;
  character.add(bookGroup);
  addMesh(bookGroup, new THREE.BoxGeometry(0.33, 0.38, 0.055), colors.bookCover, [-0.16, 0, 0]);
  addMesh(bookGroup, new THREE.BoxGeometry(0.33, 0.38, 0.055), colors.bookCover, [0.16, 0, 0]);
  addMesh(bookGroup, new THREE.BoxGeometry(0.29, 0.34, 0.025), colors.book, [-0.16, 0, 0.04]);
  addMesh(bookGroup, new THREE.BoxGeometry(0.29, 0.34, 0.025), colors.book, [0.16, 0, 0.04]);
  const pageLineMaterial = makeMaterial("#e9a1bb");
  for (let line = 0; line < 3; line += 1) {
    addMesh(bookGroup, new THREE.BoxGeometry(0.18, 0.012, 0.008), pageLineMaterial, [-0.16, 0.08 - line * 0.075, 0.058]);
    addMesh(bookGroup, new THREE.BoxGeometry(0.18, 0.012, 0.008), pageLineMaterial, [0.16, 0.08 - line * 0.075, 0.058]);
  }

  const head = new THREE.Group();
  head.position.set(0, 2.33, 0.02);
  character.add(head);

  // Back hair, ears, face, and a rounded fringe.
  addMesh(head, sphere, colors.hair, [0, 0.17, -0.055], [0.57, 0.63, 0.47]);
  addMesh(head, sphere, colors.skinShade, [-0.47, -0.01, 0.03], [0.12, 0.17, 0.12]);
  addMesh(head, sphere, colors.skinShade, [0.47, -0.01, 0.03], [0.12, 0.17, 0.12]);
  addMesh(head, sphere, colors.skin, [0, 0, 0.13], [0.47, 0.54, 0.39]);
  addMesh(head, sphere, colors.hair, [0, 0.40, 0.04], [0.57, 0.43, 0.43]);
  addMesh(head, sphere, colors.hairLight, [-0.34, 0.35, 0.30], [0.18, 0.39, 0.13]);
  addMesh(head, sphere, colors.hair, [0.32, 0.38, 0.31], [0.19, 0.42, 0.14]);

  // Tapered hair locks frame the face like a soft anime fringe.
  for (const [x, z, rotation] of [[-0.30, 0.38, -0.26], [-0.12, 0.44, -0.10], [0.10, 0.44, 0.12], [0.29, 0.38, 0.28]]) {
    const lock = addMesh(head, new THREE.ConeGeometry(0.16, 0.48, 7), colors.hair, [x, 0.15, z], [0.78, 1.0, 0.65]);
    lock.rotation.z = Math.PI + rotation;
  }
  const hairShine = makeMaterial("#a294c7", 0.42);
  addMesh(head, new THREE.SphereGeometry(0.11, 16, 12), hairShine, [-0.30, 0.55, 0.39], [0.36, 0.14, 0.06]);

  // Large expressive eyes with separate lids for blinking.
  const eyes = [];
  for (const x of [-0.19, 0.19]) {
    const eye = new THREE.Group();
    eye.position.set(x, -0.035, 0.465);
    head.add(eye);
    addMesh(eye, sphere, colors.eyeWhite, [0, 0, 0], [0.105, 0.15, 0.055]);
    addMesh(eye, sphere, colors.iris, [0.012, -0.015, 0.045], [0.063, 0.095, 0.038]);
    addMesh(eye, sphere, colors.pupil, [0.015, -0.020, 0.073], [0.035, 0.062, 0.022]);
    addMesh(eye, sphere, colors.eyeWhite, [-0.005, 0.025, 0.091], [0.021, 0.027, 0.012]);
    const brow = addMesh(eye, new THREE.CapsuleGeometry(0.018, 0.10, 2, 6), colors.hair, [0, 0.18, 0], [1.0, 0.8, 0.7]);
    brow.rotation.z = x < 0 ? -0.18 : 0.18;
    eyes.push(eye);
  }

  const nose = addMesh(head, sphere, colors.skinShade, [0, -0.17, 0.49], [0.035, 0.045, 0.035]);
  nose.castShadow = false;
  addMesh(head, sphere, colors.jacketLight, [-0.29, -0.17, 0.41], [0.10, 0.045, 0.025]);
  addMesh(head, sphere, colors.jacketLight, [0.29, -0.17, 0.41], [0.10, 0.045, 0.025]);
  const mouth = addMesh(head, sphere, colors.mouth, [0, -0.29, 0.48], [0.065, 0.022, 0.025]);
  mouth.castShadow = false;

  // Small pearl hair clip adds a friendly detail and catches the key light.
  const clip = addMesh(head, new THREE.TorusGeometry(0.105, 0.025, 8, 20), colors.gold, [0.39, 0.36, 0.36]);
  clip.rotation.z = 0.62;

  return { character, head, mouth, leftArm, rightArm, bookGroup, eyes };
}

export default function TutorAvatar3D({ speaking = false, paused = false }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    let frame = 0;
    let resizeObserver;
    let model;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 30);
    camera.position.set(0, 1.75, 7);
    camera.lookAt(0, 1.75, 0);
    scene.add(new THREE.HemisphereLight("#fff5fc", "#a7b6d1", 2.1));
    const keyLight = new THREE.DirectionalLight("#fff4e9", 3.2);
    keyLight.position.set(-3, 5, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight("#c5d9ff", 1.5);
    fillLight.position.set(4, 2, 3);
    scene.add(fillLight);
    sceneRef.current = scene;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(mount.clientWidth || 260, mount.clientHeight || 174, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.className = "tutor-avatar__canvas";
      mount.appendChild(renderer.domElement);
      model = makeCharacter(scene);
      setFailed(false);

      const resize = () => {
        if (!renderer || !mount.clientWidth || !mount.clientHeight) return;
        renderer.setSize(mount.clientWidth, mount.clientHeight, false);
        const aspect = mount.clientWidth / mount.clientHeight;
        const viewHeight = 3.65;
        camera.left = -(viewHeight * aspect) / 2;
        camera.right = (viewHeight * aspect) / 2;
        camera.top = viewHeight / 2;
        camera.bottom = -viewHeight / 2;
        camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      const startedAt = performance.now();
      const animate = (now) => {
        frame = window.requestAnimationFrame(animate);
        const elapsed = (now - startedAt) / 1000;
        const active = mount.dataset.speaking === "true";
        const isPaused = mount.dataset.paused === "true";
        model.character.position.y = isPaused ? 0 : Math.sin(elapsed * (active ? 6.0 : 2.4)) * (active ? 0.045 : 0.018);
        model.character.rotation.y = Math.sin(elapsed * 0.7) * 0.045;
        model.head.rotation.y = Math.sin(elapsed * 1.3) * 0.055;
        model.head.rotation.x = active ? Math.sin(elapsed * 4.8) * 0.025 : 0;
        model.leftArm.rotation.z = 0.28 + (active ? Math.sin(elapsed * 4.1) * 0.08 : 0);
        model.rightArm.rotation.z = -0.50 + (active ? Math.sin(elapsed * 4.1 + 1) * 0.10 : 0);
        model.bookGroup.rotation.z = -0.12 + (active ? Math.sin(elapsed * 4.1 + 1) * 0.045 : 0);
        model.mouth.scale.y = active ? 0.025 + Math.abs(Math.sin(elapsed * 13)) * 0.09 : 0.022;
        const blinkCycle = elapsed % 5.2;
        const blinking = blinkCycle > 4.82 && blinkCycle < 4.96;
        model.eyes.forEach((eye) => { eye.scale.y = blinking ? 0.08 : 1; });
        renderer.render(scene, camera);
      };
      frame = window.requestAnimationFrame(animate);
    } catch (error) {
      console.warn("3D tutor is unavailable in this browser; showing the illustrated tutor instead.", error);
      setFailed(true);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    mountRef.current.dataset.speaking = String(speaking);
    mountRef.current.dataset.paused = String(paused);
  }, [speaking, paused]);

  return (
    <div className={`tutor-avatar__3d ${failed ? "tutor-avatar__3d--failed" : ""}`} ref={mountRef}>
      {failed && (
        <div className="tutor-avatar__webgl-fallback" role="img" aria-label="Biology tutor illustration">
          <span aria-hidden="true">👩🏻‍🏫</span>
          <span>3D view unavailable</span>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef } from "react";

import { Box, Typography } from "@mui/material";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { MODEL_NEUTRAL, TEXT_SECONDARY } from "../../app/constants";
import type { NumericDimensions } from "../../app/types";

// #region Three.js drawing helpers
function addBox(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  edgeMaterial: THREE.Material,
) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial);
  mesh.add(edges);
  group.add(mesh);
}

function createLabel(text: string, span: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(255,255,255,0.86)";
    context.strokeStyle = "rgba(16,38,56,0.22)";
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(50, 22, 156, 84, 24);
    context.fill();
    context.stroke();
    context.fillStyle = "#102638";
    context.font = '800 56px "Microsoft YaHei", Arial, sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  const labelHeight = Math.max(5.2, span * 0.085);
  sprite.scale.set(labelHeight * 2.1, labelHeight, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function addLine(scene: THREE.Scene, start: THREE.Vector3, end: THREE.Vector3, material: THREE.LineBasicMaterial) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 18;
  scene.add(line);
}

function addArrowHead(scene: THREE.Scene, tip: THREE.Vector3, direction: THREE.Vector3, span: number, material: THREE.MeshBasicMaterial) {
  if (direction.lengthSq() < 1e-10) return;
  const unit = direction.clone().normalize();
  const headLength = Math.max(1.8, span * 0.032);
  const headWidth = Math.max(0.85, span * 0.015);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(headWidth, headLength, 24), material);
  cone.position.copy(tip).addScaledVector(unit, -headLength * 0.5);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit);
  cone.renderOrder = 19;
  scene.add(cone);
}

function addOutwardDimensionLine(
  scene: THREE.Scene,
  start: THREE.Vector3,
  end: THREE.Vector3,
  span: number,
  lineMaterial: THREE.LineBasicMaterial,
  headMaterial: THREE.MeshBasicMaterial,
) {
  addLine(scene, start, end, lineMaterial);
  const center = start.clone().lerp(end, 0.5);
  addArrowHead(scene, start, start.clone().sub(center), span, headMaterial);
  addArrowHead(scene, end, end.clone().sub(center), span, headMaterial);
}

function addOneWayArrow(scene: THREE.Scene, start: THREE.Vector3, end: THREE.Vector3, span: number, lineMaterial: THREE.LineBasicMaterial, headMaterial: THREE.MeshBasicMaterial) {
  addLine(scene, start, end, lineMaterial);
  addArrowHead(scene, end, end.clone().sub(start), span, headMaterial);
}

function addLeaderLine(scene: THREE.Scene, anchor: THREE.Vector3, dimensionPoint: THREE.Vector3, material: THREE.LineBasicMaterial) {
  addLine(scene, anchor, dimensionPoint, material);
}

function addDimensionGuides(scene: THREE.Scene, dimensions: NumericDimensions, span: number) {
  const gap = Math.max(5, span * 0.085);
  const lineMaterial = new THREE.LineBasicMaterial({ color: "#174457", transparent: true, opacity: 0.82, depthTest: false });
  const leaderMaterial = new THREE.LineBasicMaterial({ color: "#174457", transparent: true, opacity: 0.46, depthTest: false });
  const headMaterial = new THREE.MeshBasicMaterial({ color: "#174457", transparent: true, opacity: 0.9, depthTest: false });

  const lengthStart = new THREE.Vector3(0, -dimensions.baseWidth / 2 - gap, dimensions.baseHeight * 0.45);
  const lengthEnd = new THREE.Vector3(dimensions.length, -dimensions.baseWidth / 2 - gap, dimensions.baseHeight * 0.45);
  const widthStart = new THREE.Vector3(-gap * 0.65, -dimensions.baseWidth / 2, dimensions.baseHeight * 0.65);
  const widthEnd = new THREE.Vector3(-gap * 0.65, dimensions.baseWidth / 2, dimensions.baseHeight * 0.65);
  const heightStart = new THREE.Vector3(dimensions.length + gap, dimensions.baseWidth / 2 + gap * 0.35, 0);
  const heightEnd = new THREE.Vector3(dimensions.length + gap, dimensions.baseWidth / 2 + gap * 0.35, dimensions.height);
  const baseHeightStart = new THREE.Vector3(dimensions.length + gap * 0.5, -dimensions.baseWidth / 2 - gap * 0.35, 0);
  const baseHeightEnd = new THREE.Vector3(dimensions.length + gap * 0.5, -dimensions.baseWidth / 2 - gap * 0.35, dimensions.baseHeight);

  addLeaderLine(scene, new THREE.Vector3(0, -dimensions.baseWidth / 2, dimensions.baseHeight * 0.45), lengthStart, leaderMaterial);
  addLeaderLine(scene, new THREE.Vector3(dimensions.length, -dimensions.baseWidth / 2, dimensions.baseHeight * 0.45), lengthEnd, leaderMaterial);
  addLeaderLine(scene, new THREE.Vector3(0, -dimensions.baseWidth / 2, dimensions.baseHeight * 0.65), widthStart, leaderMaterial);
  addLeaderLine(scene, new THREE.Vector3(0, dimensions.baseWidth / 2, dimensions.baseHeight * 0.65), widthEnd, leaderMaterial);
  addLeaderLine(scene, new THREE.Vector3(dimensions.length, dimensions.baseWidth / 2, 0), heightStart, leaderMaterial);
  addLeaderLine(scene, new THREE.Vector3(dimensions.length, dimensions.baseWidth / 2, dimensions.height), heightEnd, leaderMaterial);
  addLeaderLine(scene, new THREE.Vector3(dimensions.length, -dimensions.baseWidth / 2, 0), baseHeightStart, leaderMaterial);
  addLeaderLine(scene, new THREE.Vector3(dimensions.length, -dimensions.baseWidth / 2, dimensions.baseHeight), baseHeightEnd, leaderMaterial);

  addOutwardDimensionLine(scene, lengthStart, lengthEnd, span, lineMaterial, headMaterial);
  addOutwardDimensionLine(scene, widthStart, widthEnd, span, lineMaterial, headMaterial);
  addOutwardDimensionLine(scene, heightStart, heightEnd, span, lineMaterial, headMaterial);
  addOutwardDimensionLine(scene, baseHeightStart, baseHeightEnd, span, lineMaterial, headMaterial);

  const thicknessZ = dimensions.baseHeight + dimensions.wallHeight * 0.66;
  const thicknessX = dimensions.length * 0.6;
  const halfThickness = dimensions.thickness / 2;
  addLeaderLine(scene, new THREE.Vector3(thicknessX, halfThickness, thicknessZ), new THREE.Vector3(thicknessX, halfThickness + gap * 0.18, thicknessZ), leaderMaterial);
  addLeaderLine(scene, new THREE.Vector3(thicknessX, -halfThickness, thicknessZ), new THREE.Vector3(thicknessX, -halfThickness - gap * 0.18, thicknessZ), leaderMaterial);
  addOneWayArrow(
    scene,
    new THREE.Vector3(thicknessX, halfThickness + gap * 0.72, thicknessZ),
    new THREE.Vector3(thicknessX, halfThickness, thicknessZ),
    span,
    lineMaterial,
    headMaterial,
  );
  addOneWayArrow(
    scene,
    new THREE.Vector3(thicknessX, -halfThickness - gap * 0.72, thicknessZ),
    new THREE.Vector3(thicknessX, -halfThickness, thicknessZ),
    span,
    lineMaterial,
    headMaterial,
  );

  const labels: Array<[string, THREE.Vector3]> = [
    ["L", lengthStart.clone().lerp(lengthEnd, 0.5).add(new THREE.Vector3(0, -gap * 0.34, 0))],
    ["W", widthStart.clone().lerp(widthEnd, 0.5).add(new THREE.Vector3(-gap * 0.34, 0, 0))],
    ["H1", heightStart.clone().lerp(heightEnd, 0.5).add(new THREE.Vector3(gap * 0.34, 0, 0))],
    ["H2", baseHeightStart.clone().lerp(baseHeightEnd, 0.5).add(new THREE.Vector3(gap * 0.34, 0, 0))],
    ["t", new THREE.Vector3(thicknessX, 0, thicknessZ + gap * 0.36)],
  ];

  labels.forEach(([text, position]) => {
    const label = createLabel(text, span);
    label.position.copy(position);
    scene.add(label);
  });
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const candidate = child as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    candidate.geometry?.dispose();
    if (Array.isArray(candidate.material)) {
      candidate.material.forEach((material) => {
        (material as THREE.Material & { map?: THREE.Texture }).map?.dispose();
        material.dispose();
      });
    } else {
      (candidate.material as THREE.Material & { map?: THREE.Texture } | undefined)?.map?.dispose();
      candidate.material?.dispose();
    }
  });
}
// #endregion

export function WorkpieceGeometryPreview({ dimensions }: { dimensions: NumericDimensions | null }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // #region Three.js scene lifecycle
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !dimensions) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f5f8fa");
    scene.up.set(0, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
      touchAction: "none",
      cursor: "grab",
      zIndex: "0",
    });
    mount.appendChild(renderer.domElement);

    const span = Math.max(dimensions.length, dimensions.baseWidth, dimensions.height);
    const camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.1, span * 20);
    camera.up.set(0, 0, 1);
    camera.position.set(dimensions.length * 0.76, span * 0.9, dimensions.height * 0.8 + span * 0.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.72;
    controls.target.set(dimensions.length / 2, 0, dimensions.height / 2);
    controls.update();
    const handlePointerDown = () => {
      renderer.domElement.style.cursor = "grabbing";
    };
    const handlePointerUp = () => {
      renderer.domElement.style.cursor = "grab";
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);

    scene.add(new THREE.HemisphereLight("#ffffff", "#9aa9b5", 1.7));
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.1);
    keyLight.position.set(-span * 0.25, span * 0.7, span);
    scene.add(keyLight);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: MODEL_NEUTRAL, metalness: 0.06, roughness: 0.54 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: "#b7c4cc", metalness: 0.04, roughness: 0.5 });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: "#536b7a", transparent: true, opacity: 0.72 });

    addBox(
      modelGroup,
      [dimensions.length, dimensions.baseWidth, dimensions.baseHeight],
      [dimensions.length / 2, 0, dimensions.baseHeight / 2],
      bodyMaterial,
      edgeMaterial,
    );
    addBox(
      modelGroup,
      [dimensions.length, dimensions.thickness, dimensions.wallHeight],
      [dimensions.length / 2, 0, dimensions.baseHeight + dimensions.wallHeight / 2],
      wallMaterial,
      edgeMaterial,
    );
    addDimensionGuides(scene, dimensions, span);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let animationFrame = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [dimensions]);
  // #endregion

  return (
    <Box
      ref={mountRef}
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: "4 / 3",
        overflow: "hidden",
        borderRadius: 1,
        backgroundColor: "#f5f8fa",
      }}
    >
      {!dimensions && (
        <Box sx={{ position: "absolute", inset: 0, zIndex: 1, display: "grid", placeItems: "center", color: TEXT_SECONDARY, fontSize: 12.5, fontWeight: 700 }}>
          等待有效几何参数
        </Box>
      )}
      <Typography sx={{ position: "absolute", left: 10, bottom: 8, zIndex: 1, color: TEXT_SECONDARY, fontSize: 11.5, pointerEvents: "none" }}>
        工件示意
      </Typography>
    </Box>
  );
}

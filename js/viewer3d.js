// Esqueleto do modelo do OpenSim em 3D (Three.js), sincronizado com o vídeo.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cinematica, valoresDoMot, centroMassa, lerVTP } from './model.js';

const GEO_PUBLICA = 'https://mc-opencap-public.s3.us-west-2.amazonaws.com/geometries_vtp/LaiArnold/';
const cacheGeo = new Map();

async function geometria(arquivo, sessao) {
  const chave = arquivo;
  if (cacheGeo.has(chave)) return cacheGeo.get(chave);
  const p = (async () => {
    const local = sessao?.files.get(`OpenSimData/Model/Geometry/${arquivo}`);
    let txt;
    if (local) txt = await local.text();
    else { const r = await fetch(GEO_PUBLICA + arquivo); if (!r.ok) throw new Error('malha ' + arquivo); txt = await r.text(); }
    const v = lerVTP(txt);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(v.pontos, 3));
    g.setIndex(new THREE.BufferAttribute(v.triangulos, 1));
    g.computeVertexNormals();
    return g;
  })();
  cacheGeo.set(chave, p);
  return p;
}

export function criarVisor3D(el) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  el.appendChild(renderer.domElement);
  const cena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  const ctrl = new OrbitControls(cam, renderer.domElement);
  ctrl.enableDamping = true;
  cena.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 1.4); sol.position.set(2, 4, 3); cena.add(sol);
  const grade = new THREE.GridHelper(6, 24, 0x888888, 0x555555); grade.material.transparent = true; grade.material.opacity = 0.35; cena.add(grade);
  const matOsso = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.75 });
  const matD = new THREE.MeshStandardMaterial({ color: 0xd23a3a, roughness: 0.6 });
  const matE = new THREE.MeshStandardMaterial({ color: 0x2f6fdb, roughness: 0.6 });
  const bolaCM = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 14), new THREE.MeshStandardMaterial({ color: 0x1d7a46, emissive: 0x0b3a20 }));
  const prumo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0x1d7a46, dashSize: 0.03, gapSize: 0.02 }));
  cena.add(bolaCM, prumo);
  const grupos = {};
  let modelo = null, mot = null, dir = { x: 1, z: 0 }, vista = 'lateral', alvo = new THREE.Vector3(0, 0.9, 0), pronto = false, chao = 0, mostrarCM = true;
  const pesDe = { D: ['calcn_r', 'toes_r'], E: ['calcn_l', 'toes_l'] };

  function tamanho() {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  new ResizeObserver(() => { tamanho(); render(); }).observe(el);

  function posicionarCamera() {
    const d = 4.2, ml = new THREE.Vector3(-dir.z, 0, dir.x), ap = new THREE.Vector3(dir.x, 0, dir.z);
    let off;
    if (vista === 'lateral') off = ml.clone().multiplyScalar(d);            // olhando o lado direito
    else if (vista === 'lateralE') off = ml.clone().multiplyScalar(-d);
    else if (vista === 'frontal') off = ap.clone().multiplyScalar(d);
    else if (vista === 'posterior') off = ap.clone().multiplyScalar(-d);
    else if (vista === 'cima') off = new THREE.Vector3(0, d, 0).add(ml.clone().multiplyScalar(0.01));
    else return; // livre
    cam.position.copy(alvo).add(off); cam.lookAt(alvo); ctrl.target.copy(alvo); ctrl.update();
  }

  function render() { if (pronto) renderer.render(cena, cam); }
  (function loop() { requestAnimationFrame(loop); if (vista === 'livre' && ctrl.update()) render(); })();
  ctrl.addEventListener('change', () => { if (vista === 'livre') render(); });
  ctrl.addEventListener('start', () => { if (vista !== 'livre') { vista = 'livre'; el.dispatchEvent(new CustomEvent('vista', { detail: 'livre' })); } });

  return {
    async carregar(mod, sessao, motion, direcao) {
      pronto = false;
      for (const g of Object.values(grupos)) cena.remove(g);
      for (const k in grupos) delete grupos[k];
      modelo = mod; mot = motion; dir = direcao || dir;
      const tarefas = [];
      for (const [nome, b] of Object.entries(mod.corpos)) {
        const g = new THREE.Group(); g.matrixAutoUpdate = false; grupos[nome] = g; cena.add(g);
        const lado = pesDe.D.includes(nome) ? 'D' : pesDe.E.includes(nome) ? 'E' : null;
        for (const geo of b.geos) {
          tarefas.push(geometria(geo.arquivo, sessao).then(gg => {
            const m = new THREE.Mesh(gg, matOsso); m.scale.set(...geo.escala); m.userData.lado = lado; g.add(m);
          }).catch(() => {}));
        }
      }
      await Promise.all(tarefas);
      pronto = true;
      // altura do chão: pés no ponto mais baixo do trial
      chao = Infinity;
      for (let i = 0; i < mot.time.length; i += 10) { const X = cinematica(mod, valoresDoMot(mod, mot, i)); for (const c of [...pesDe.D, ...pesDe.E]) if (X[c]) chao = Math.min(chao, X[c].p[1]); }
      grade.position.y = isFinite(chao) ? chao - 0.03 : 0;
      tamanho();
    },
    quadro(i, emApoio = {}) {
      if (!pronto || !modelo) return;
      const X = cinematica(modelo, valoresDoMot(modelo, mot, i));
      const m4 = new THREE.Matrix4();
      for (const [nome, g] of Object.entries(grupos)) {
        const T = X[nome]; if (!T) continue;
        const R = T.R;
        m4.set(R[0], R[1], R[2], T.p[0], R[3], R[4], R[5], T.p[1], R[6], R[7], R[8], T.p[2], 0, 0, 0, 1);
        g.matrix.copy(m4); g.matrixWorldNeedsUpdate = true;
        for (const ms of g.children) ms.material = ms.userData.lado && emApoio[ms.userData.lado] ? (ms.userData.lado === 'D' ? matD : matE) : matOsso;
      }
      const cm = centroMassa(modelo, X);
      if (cm) {
        bolaCM.position.set(...cm); bolaCM.visible = mostrarCM; prumo.visible = mostrarCM;
        prumo.geometry.setFromPoints([new THREE.Vector3(...cm), new THREE.Vector3(cm[0], grade.position.y, cm[2])]); prumo.computeLineDistances();
        alvo.set(cm[0], grade.position.y + 0.95, cm[2]);
      }
      if (vista !== 'livre') posicionarCamera();
      render();
    },
    setVista(v) { vista = v; posicionarCamera(); render(); },
    setCM(v) { mostrarCM = v; },
    pronto: () => pronto,
  };
}

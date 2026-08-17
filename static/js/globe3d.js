(function () {
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var container = document.getElementById("hero-globe");
  if (!container || typeof THREE === "undefined") return;

  function webglAvailable() {
    try {
      var canvas = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
    } catch (e) {
      return false;
    }
  }
  if (!webglAvailable()) return;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 18;

  /* Léger mouvement de caméra (parallaxe douce) */
  var camBaseX = 0, camBaseY = 0;
  var camTargetX = 0, camTargetY = 0;
  var camTime = 0;
  window.addEventListener("mousemove", function (e) {
    camTargetX = (e.clientX / window.innerWidth - 0.5) * 1.4;
    camTargetY = (e.clientY / window.innerHeight - 0.5) * 1.0;
  }, { passive: true });

  var renderer = new THREE.WebGLRenderer({ canvas: container, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  var globeGroup = new THREE.Group();
  scene.add(globeGroup);

  /* Sphère de base (teinte verte translucide pour donner le volume) */
  var sphereGeo = new THREE.SphereGeometry(5, 64, 64);
  var sphereMat = new THREE.MeshLambertMaterial({
    color: 0x2e6656,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  var sphere = new THREE.Mesh(sphereGeo, sphereMat);
  globeGroup.add(sphere);

  /* Continents (vraie carte du monde, colorisée en vert lumineux) */
  var continentsMesh;
  var maskImage = new Image();
  maskImage.crossOrigin = "anonymous";
  maskImage.src = "/static/img/earth-mask.jpg";
  maskImage.onload = function () {
    var mapCanvas = document.createElement("canvas");
    mapCanvas.width = maskImage.width;
    mapCanvas.height = maskImage.height;
    var mapCx = mapCanvas.getContext("2d");
    mapCx.drawImage(maskImage, 0, 0);
    var imgData = mapCx.getImageData(0, 0, mapCanvas.width, mapCanvas.height);
    var data = imgData.data;
    /* La carte spéculaire terre/mer : océan = clair, terre = sombre.
       On colorise en vert lumineux uniquement sur les terres (pixels sombres). */
    for (var p = 0; p < data.length; p += 4) {
      var lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
      var isLand = lum < 90;
      if (isLand) {
        data[p] = 63;
        data[p + 1] = 223;
        data[p + 2] = 154;
        data[p + 3] = 235;
      } else {
        data[p + 3] = 0;
      }
    }
    mapCx.putImageData(imgData, 0, 0);

    var mapTexture = new THREE.CanvasTexture(mapCanvas);
    var continentsMat = new THREE.MeshBasicMaterial({
      map: mapTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    continentsMesh = new THREE.Mesh(new THREE.SphereGeometry(5.02, 64, 64), continentsMat);
    globeGroup.add(continentsMesh);
    renderOnce();
  };

  /* Halo / atmosphère lumineuse autour du globe */
  var glowGeo = new THREE.SphereGeometry(5.6, 48, 48);
  var glowMat = new THREE.MeshBasicMaterial({
    color: 0x3fdf9a,
    transparent: true,
    opacity: 0.09,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var glowMesh = new THREE.Mesh(glowGeo, glowMat);
  globeGroup.add(glowMesh);

  /* Points sur la sphère */
  var numPoints = 320;
  var golden = Math.PI * (3 - Math.sqrt(5));
  var positions = new Float32Array(numPoints * 3);
  var pointsWorld = [];
  for (var i = 0; i < numPoints; i++) {
    var y = 1 - (i / (numPoints - 1)) * 2;
    var r = Math.sqrt(1 - y * y);
    var theta = golden * i;
    var x = Math.cos(theta) * r;
    var z = Math.sin(theta) * r;
    var v = new THREE.Vector3(x * 5, y * 5, z * 5);
    pointsWorld.push(v);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }

  /* Texture de point lumineux (glow doux) */
  var dotCanvas = document.createElement("canvas");
  dotCanvas.width = 64;
  dotCanvas.height = 64;
  var dotCx = dotCanvas.getContext("2d");
  var dotGradient = dotCx.createRadialGradient(32, 32, 0, 32, 32, 32);
  dotGradient.addColorStop(0, "rgba(255,255,255,1)");
  dotGradient.addColorStop(0.35, "rgba(190,240,215,0.9)");
  dotGradient.addColorStop(1, "rgba(190,240,215,0)");
  dotCx.fillStyle = dotGradient;
  dotCx.fillRect(0, 0, 64, 64);
  var dotTexture = new THREE.CanvasTexture(dotCanvas);

  var pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  var pointsMat = new THREE.PointsMaterial({
    map: dotTexture,
    color: 0xffffff,
    size: 0.34,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false
  });
  var pointsObj = new THREE.Points(pointsGeo, pointsMat);
  pointsObj.renderOrder = 1;
  globeGroup.add(pointsObj);

  /* Lignes entre points proches */
  var lineIndices = [];
  var linkDist = 1.8;
  for (var a = 0; a < numPoints; a++) {
    for (var b = a + 1; b < numPoints; b++) {
      if (pointsWorld[a].distanceTo(pointsWorld[b]) < linkDist) {
        lineIndices.push(a, b);
      }
    }
  }
  var linesGeo = new THREE.BufferGeometry();
  linesGeo.setIndex(lineIndices);
  linesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  var linesMat = new THREE.LineBasicMaterial({
    color: 0x8dbcab,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false
  });
  var linesObj = new THREE.LineSegments(linesGeo, linesMat);
  linesObj.renderOrder = 1;
  globeGroup.add(linesObj);

  /* Lumières */
  var ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 5, 10);
  scene.add(dirLight);

  /* Logo central : texte "AxonTerra" dessiné + icône feuille */
  var logoSprite;
  (function buildLogoSprite() {
    var w = 560, h = 220;
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var cx = c.getContext("2d");

    /* Petite icône "feuille" dans un cercle */
    var iconCx = w / 2, iconCy = 42, iconR = 16;
    cx.beginPath();
    cx.arc(iconCx, iconCy, iconR, 0, Math.PI * 2);
    cx.strokeStyle = "rgba(148,197,178,0.8)";
    cx.lineWidth = 2;
    cx.stroke();
    cx.fillStyle = "#3fdf9a";
    cx.beginPath();
    cx.ellipse(iconCx - 3, iconCy + 1, 6, 9, Math.PI / 4, 0, Math.PI * 2);
    cx.fill();
    cx.beginPath();
    cx.ellipse(iconCx + 4, iconCy - 2, 6, 9, -Math.PI / 4, 0, Math.PI * 2);
    cx.fill();

    /* Texte "AxonTerra" avec le "n" en orange */
    var text = "AxonTerra";
    var accentIndex = 3; /* position du "n" dans "Axon" */
    cx.font = "800 62px Sora, sans-serif";
    cx.textBaseline = "middle";
    var widths = [];
    var totalWidth = 0;
    for (var i = 0; i < text.length; i++) {
      var cw = cx.measureText(text[i]).width;
      widths.push(cw);
      totalWidth += cw;
    }
    var startX = (w - totalWidth) / 2;
    var textY = h / 2 + 28;
    var curX = startX;
    for (var j = 0; j < text.length; j++) {
      cx.fillStyle = j === accentIndex ? "#e08a3e" : "#ffffff";
      cx.fillText(text[j], curX, textY);
      curX += widths[j];
    }

    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    var spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    logoSprite = new THREE.Sprite(spriteMat);
    logoSprite.scale.set(8.2, 3.2, 1);
    logoSprite.renderOrder = 999;
    scene.add(logoSprite);
    renderOnce();
  })();

  /* Interaction souris / tactile (Pointer Events unifiés) */
  container.style.touchAction = "none";
  var isDragging = false;
  var previousMouse = { x: 0, y: 0 };
  var rotationVelocity = { x: 0, y: 0.003 };

  function onPointerDown(e) {
    isDragging = true;
    previousMouse.x = e.clientX;
    previousMouse.y = e.clientY;
    container.style.cursor = "grabbing";
    if (container.setPointerCapture) {
      try { container.setPointerCapture(e.pointerId); } catch (err) {}
    }
  }
  function onPointerMove(e) {
    if (!isDragging) return;
    var dx = e.clientX - previousMouse.x;
    var dy = e.clientY - previousMouse.y;
    rotationVelocity.y += dx * 0.0009;
    rotationVelocity.x += dy * 0.0009;
    previousMouse.x = e.clientX;
    previousMouse.y = e.clientY;
  }
  function onPointerUp(e) {
    isDragging = false;
    container.style.cursor = "grab";
    if (container.releasePointerCapture && e && e.pointerId != null) {
      try { container.releasePointerCapture(e.pointerId); } catch (err) {}
    }
  }

  if (window.PointerEvent) {
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);
  } else {
    /* Repli pour navigateurs sans Pointer Events */
    container.addEventListener("mousedown", function (e) { onPointerDown(e); });
    window.addEventListener("mousemove", function (e) { onPointerMove(e); });
    window.addEventListener("mouseup", function (e) { onPointerUp(e); });
    container.addEventListener("touchstart", function (e) {
      var t = e.touches[0];
      onPointerDown({ clientX: t.clientX, clientY: t.clientY, pointerId: null });
    }, { passive: true });
    window.addEventListener("touchmove", function (e) {
      var t = e.touches[0];
      onPointerMove({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: true });
    window.addEventListener("touchend", function () { onPointerUp(); });
  }

  /* Redimensionnement */
  function onResize() {
    var w = container.clientWidth;
    var h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", onResize);
  onResize();

  /* Visibilité */
  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(container);
  }

  /* Animation */
  var rotationY = 0;
  var rotationX = 0.2;
  var needsRender = true;
  var logoOrbitAngle = 0;

  function renderOnce() {
    renderer.render(scene, camera);
  }

  (function animate() {
    requestAnimationFrame(animate);
    if (!visible || document.hidden) return;

    /* Rotation (auto + glisser) : toujours active, y compris avec
       prefers-reduced-motion, car il s'agit d'une interaction utilisateur
       et de l'élément visuel principal du Hero. */
    rotationY += rotationVelocity.y;
    rotationX += rotationVelocity.x;
    rotationVelocity.x *= 0.95;
    rotationVelocity.y *= 0.98;
    if (!isDragging) {
      rotationVelocity.y += (0.003 - rotationVelocity.y) * 0.02;
    }
    globeGroup.rotation.y = rotationY;
    globeGroup.rotation.x = rotationX;

    /* Orbite lente du texte AxonTerra autour du globe : toujours active */
    if (logoSprite) {
      logoOrbitAngle += 0.006;
      logoSprite.position.x = Math.sin(logoOrbitAngle) * 2.1;
      logoSprite.position.y = Math.sin(logoOrbitAngle * 0.6) * 0.7;
      logoSprite.position.z = Math.cos(logoOrbitAngle) * 0.6;
    }

    if (!reducedMotion) {
      /* Pulsation douce du halo lumineux */
      glowMat.opacity = 0.09 + Math.sin(camTime * 1.4) * 0.03;

      /* Parallaxe souris + drift automatique doux */
      camTime += 0.006;
      camBaseX += (camTargetX - camBaseX) * 0.03;
      camBaseY += (camTargetY - camBaseY) * 0.03;
      camera.position.x = camBaseX + Math.sin(camTime) * 0.35;
      camera.position.y = -camBaseY + Math.cos(camTime * 0.8) * 0.25;
      camera.lookAt(0, 0, 0);
    }
    renderer.render(scene, camera);
  })();
})();

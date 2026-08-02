const IMAGES = Array.from({ length: 40 }, (_, i) => `assets/images/${i + 1}.jpg`);
const VIDEOS = Array.from({ length: 4 }, (_, i) => `assets/videos/${i + 1}.mp4`);

const INTRO_SEQUENCE = [
    { type: 'video', src: 'assets/videos/1.mp4' },
    { type: 'image', src: 'assets/images/1.jpg' },
    { type: 'image', src: 'assets/images/2.jpg' }
];

let scene, camera, renderer, globeGroup, raycaster, mouse;
let isDragging = false;
let startX, startY, startTime;
let lastTouchX = 0, lastTouchY = 0; // Mobile rotation ke liye

// 1. Loading Phase
window.onload = () => {
    let bar = document.getElementById('progress-bar');
    let p = 0;
    let inv = setInterval(() => {
        p += 5;
        bar.style.width = p + '%';
        if(p >= 100) {
            clearInterval(inv);
            document.getElementById('enter-btn').classList.remove('hidden');
            document.getElementById('creator-tag').classList.remove('hidden');
        }
    }, 40);
};

document.getElementById('enter-btn').onclick = () => {
    gsap.to('#loader', { opacity: 0, duration: 0.8, onComplete: () => {
        document.getElementById('loader').style.display = 'none';
        playIntro();
    }});
};

// 2. Intro Sequence
async function playIntro() {
    const introDiv = document.getElementById('intro-slideshow');
    introDiv.classList.remove('hidden');
    const wrap = document.getElementById('slideshow-container');

    for (let i = 0; i < INTRO_SEQUENCE.length; i++) {
        const item = INTRO_SEQUENCE[i];
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.innerHTML = item.type === 'video' 
            ? `<video src="${item.src}" autoplay id="intro-vid"></video>` 
            : `<img src="${item.src}">`;
        
        wrap.appendChild(slide);
        gsap.to(slide, { opacity: 1, duration: 1.5 });
        await new Promise(r => setTimeout(r, 4500));
        
        if (i < INTRO_SEQUENCE.length - 1) {
            gsap.to(slide, { opacity: 0, duration: 1 });
        } else {
            gsap.to(introDiv, { opacity: 0, duration: 1.5, onComplete: () => {
                introDiv.style.display = 'none';
                initGallery();
            }});
        }
    }
}

// 3. Main Gallery Logic
function initGallery() {
    document.getElementById('ui-layer').classList.remove('hidden');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 25;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Particles
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(1500 * 3);
    for(let i=0; i<4500; i++) starPos[i] = (Math.random() - 0.5) * 150;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.15, color: 0x007aff })));

    globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const allMedia = [
        ...VIDEOS.map(v => ({type: 'video', src: v})),
        ...IMAGES.map(img => ({type: 'image', src: img}))
    ];

    const radius = 11;
    const loader = new THREE.TextureLoader();

    allMedia.forEach((item, i) => {
        const phi = Math.acos(-1 + (2 * i) / allMedia.length);
        const theta = Math.sqrt(allMedia.length * Math.PI) * phi;

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 3),
            new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0 })
        );
        
        mesh.position.set(radius * Math.cos(theta) * Math.sin(phi), radius * Math.sin(theta) * Math.sin(phi), radius * Math.cos(phi));
        mesh.lookAt(0, 0, 0);
        mesh.userData = item;

        if(item.type === 'image') {
            loader.load(item.src, (t) => {
                mesh.material.map = t; mesh.material.opacity = 1;
                const aspect = t.image.width / t.image.height;
                mesh.scale.set(aspect > 1 ? 1.2 : 1.2 * aspect, aspect > 1 ? 1.2 / aspect : 1.2, 1);
            });
        } else {
            const v = document.createElement('video');
            v.src = item.src; v.muted = true; v.loop = true; v.play();
            mesh.material.map = new THREE.VideoTexture(v); mesh.material.opacity = 1;
        }
        globeGroup.add(mesh);
    });

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // --- Interaction Events (Desktop + Mobile Fix) ---

    // 1. Mouse Events
    window.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY, e.movementX, e.movementY));
    window.addEventListener('mouseup', (e) => handleEnd(e.clientX, e.clientY));

    // 2. Touch Events (For Mobile)
    window.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        handleStart(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Screen scroll hone se rokta hai
        const touch = e.touches[0];
        const movementX = touch.clientX - lastTouchX;
        const movementY = touch.clientY - lastTouchY;
        
        handleMove(touch.clientX, touch.clientY, movementX, movementY);
        
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        // Touchend me coordinates nahi milte, isliye lastTouch use karte hain
        handleEnd(lastTouchX, lastTouchY);
    });

    function handleStart(x, y) {
        isDragging = true;
        startX = x; startY = y; startTime = Date.now();
    }

    function handleMove(x, y, movX, movY) {
        if(isDragging) {
            globeGroup.rotation.y += movX * 0.005;
            globeGroup.rotation.x += movY * 0.005;
        }
        mouse.x = (x / window.innerWidth) * 2 - 1;
        mouse.y = -(y / window.innerHeight) * 2 + 1;
    }

    function handleEnd(x, y) {
        isDragging = false;
        const moveDist = Math.hypot(x - startX, y - startY);
        const duration = Date.now() - startTime;

        if (moveDist < 10 && duration < 300) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(globeGroup.children);
            if(intersects.length > 0) {
                openLightbox(intersects[0].object.userData);
            }
        }
    }

    animate();
}

function openLightbox(data) {
    const lb = document.getElementById('lightbox');
    const holder = document.getElementById('media-holder');
    holder.innerHTML = '';
    if(data.type === 'video') {
        holder.innerHTML = `<video src="${data.src}" controls autoplay playsinline style="width:100%;"></video>`;
    } else {
        holder.innerHTML = `<img src="${data.src}">`;
    }
    lb.classList.add('active');
}

function closeLightbox() {
    const lb = document.getElementById('lightbox');
    lb.classList.remove('active');
    setTimeout(() => { document.getElementById('media-holder').innerHTML = ''; }, 400);
}

function animate() {
    requestAnimationFrame(animate);
    if(!isDragging) globeGroup.rotation.y += 0.001;
    renderer.render(scene, camera);
}

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
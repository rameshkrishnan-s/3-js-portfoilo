import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

try {
    console.log('Initializing Three.js...');
    console.log('Three.js Version:', THREE.REVISION);

    // Scene setup
    const canvas = document.querySelector('canvas.webgl');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });

    // Loading manager setup
    const loadingManager = new THREE.LoadingManager();
    const loadingScreen = document.querySelector('.loading-screen');

    loadingManager.onStart = function(url, itemsLoaded, itemsTotal) {
        loadingScreen.style.display = 'flex';
    };

    loadingManager.onLoad = function() {
        console.log('All resources loaded');
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    };

    loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
        console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    };

    loadingManager.onError = function(url) {
        console.error('Error loading ' + url);
    };

    // Initialize renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    // Camera setup
    camera.position.z = 30;
    camera.position.y = 5;
    camera.lookAt(0, 0, 0);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    // Add controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 50;

    // Mouse interaction
    const mouse = {
        x: 0,
        y: 0,
        target: { x: 0, y: 0 }
    };

    window.addEventListener('mousemove', (event) => {
        mouse.target.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.target.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Texture loader setup
    const textureLoader = new THREE.TextureLoader(loadingManager);

    // Load space background texture
    const spaceTexture = textureLoader.load('/textures/space.jpg', 
        // onLoad callback
        function(texture) {
            scene.background = texture;
        }
    );

    // Create a dummy texture load to ensure loading screen shows
    textureLoader.load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');

    // Black Hole with enhanced realism
    class BlackHole {
        constructor() {
            this.group = new THREE.Group();
            
            // Event horizon (main black sphere)
            const blackHoleGeometry = new THREE.SphereGeometry(3, 128, 128);
            const blackHoleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x000000,
                transparent: true,
                opacity: 0.98
            });
            this.mesh = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
            
            // Enhanced accretion disk with multiple layers
            this.createAccretionDisk();
            
            // Gravitational lensing effect (distortion sphere)
            const lensGeometry = new THREE.SphereGeometry(3.5, 128, 128);
            const lensShader = {
                uniforms: {
                    time: { value: 0 }
                },
                vertexShader: `
                    varying vec3 vNormal;
                    varying vec2 vUv;
                    void main() {
                        vNormal = normal;
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec3 vNormal;
                    varying vec2 vUv;
                    uniform float time;
                    
                    void main() {
                        vec3 baseColor = vec3(0.0, 0.0, 0.0);
                        float distortion = sin(vUv.x * 10.0 + time) * 0.5 + 0.5;
                        float alpha = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
                        alpha *= distortion * 0.5;
                        gl_FragColor = vec4(baseColor, alpha);
                    }
                `
            };
            const lensMaterial = new THREE.ShaderMaterial({
                uniforms: lensShader.uniforms,
                vertexShader: lensShader.vertexShader,
                fragmentShader: lensShader.fragmentShader,
                transparent: true,
                side: THREE.DoubleSide
            });
            this.lensing = new THREE.Mesh(lensGeometry, lensMaterial);
            
            // Outer glow effect
            const glowGeometry = new THREE.SphereGeometry(4, 128, 128);
            const glowMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: new THREE.Color(0x00aaff) }
                },
                vertexShader: `
                    varying vec3 vNormal;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 color;
                    uniform float time;
                    varying vec3 vNormal;
                    void main() {
                        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                        intensity = intensity * (0.9 + 0.1 * sin(time * 2.0));
                        gl_FragColor = vec4(color, intensity);
                    }
                `,
                transparent: true,
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending
            });
            this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
            
            // Add all components to group
            this.group.add(this.mesh);
            this.group.add(this.lensing);
            this.group.add(this.glow);
            this.accretionDisks.forEach(disk => this.group.add(disk));
            
            // Position the black hole
            this.group.position.set(0, 0, -20);
            scene.add(this.group);
        }
        
        createAccretionDisk() {
            this.accretionDisks = [];
            const diskColors = [
                new THREE.Color(0xff3300), // Hot inner disk
                new THREE.Color(0xff6600), // Middle disk
                new THREE.Color(0xff9900)  // Outer disk
            ];
            
            for (let i = 0; i < 3; i++) {
                const radius = 3.5 + i * 1.5;
                const diskGeometry = new THREE.RingGeometry(radius, radius + 1.5, 128, 8);
                const diskMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 },
                        color: { value: diskColors[i] }
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform vec3 color;
                        uniform float time;
                        varying vec2 vUv;
                        
                        float rand(vec2 co) {
                            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
                        }
                        
                        void main() {
                            float noise = rand(vUv + time * 0.1);
                            float intensity = (0.7 + 0.3 * sin(vUv.x * 20.0 + time * 2.0)) * (0.7 + 0.3 * noise);
                            vec3 finalColor = color * intensity;
                            float alpha = intensity * (1.0 - abs(vUv.y - 0.5) * 2.0);
                            gl_FragColor = vec4(finalColor, alpha * 0.7);
                        }
                    `,
                    transparent: true,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending
                });
                
                const disk = new THREE.Mesh(diskGeometry, diskMaterial);
                disk.rotation.x = Math.PI / 2;
                disk.rotation.z = Math.random() * Math.PI * 2;
                this.accretionDisks.push(disk);
            }
        }
        
        update(time) {
            // Update shader uniforms
            this.lensing.material.uniforms.time.value = time;
            this.glow.material.uniforms.time.value = time;
            
            // Rotate accretion disks at different speeds
            this.accretionDisks.forEach((disk, i) => {
                disk.rotation.z += (0.002 - i * 0.0005);
                disk.material.uniforms.time.value = time;
            });
            
            // Subtle oscillation of the entire black hole
            this.group.rotation.y = Math.sin(time * 0.0003) * 0.1;
            this.group.rotation.x = Math.cos(time * 0.0002) * 0.05;
        }
    }

    const blackHole = new BlackHole();

    // Enhanced Star class
    class Star {
        constructor() {
            this.geometry = new THREE.SphereGeometry(0.1, 8, 8);
            this.material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: Math.random()
            });
            this.mesh = new THREE.Mesh(this.geometry, this.material);
            
            // Random position
            const radius = Math.random() * 1000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            this.mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
            this.mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
            this.mesh.position.z = radius * Math.cos(phi);
            
            this.originalZ = this.mesh.position.z;
            this.speed = Math.random() * 0.2 + 0.1;
            scene.add(this.mesh);
        }
        
        update() {
            // Move stars towards camera
            this.mesh.position.z += this.speed;
            
            // Reset star position if it gets too close
            if (this.mesh.position.z > 50) {
                this.mesh.position.z = -1000;
            }
            
            // Twinkle effect
            this.material.opacity = Math.random() * 0.3 + 0.7;
        }
    }

    // Create stars
    const stars = Array(1000).fill().map(() => new Star());

    // Create planet class with enhanced features
    class Planet {
        constructor(radius, color, orbitRadius, rotationSpeed, orbitSpeed) {
            const geometry = new THREE.SphereGeometry(radius, 64, 64);
            
            // Create base material with emissive glow
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.2,
                shininess: 15,
                specular: new THREE.Color(0.5, 0.5, 0.5),
            });

            this.mesh = new THREE.Mesh(geometry, material);
            this.orbitRadius = orbitRadius;
            this.rotationSpeed = rotationSpeed;
            this.orbitSpeed = orbitSpeed;

            // Add rings to some planets
            if (Math.random() > 0.5) {
                const ringGeometry = new THREE.RingGeometry(radius * 1.5, radius * 2, 32);
                const ringMaterial = new THREE.MeshPhongMaterial({
                    color: color,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.5
                });
                this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
                this.ring.rotation.x = Math.PI / 3;
                this.mesh.add(this.ring);
            }

            // Add atmosphere
            const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.2, 64, 64);
            const atmosphereMaterial = new THREE.MeshPhongMaterial({
                color: color,
                transparent: true,
                opacity: 0.1,
                side: THREE.BackSide
            });
            this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            this.mesh.add(this.atmosphere);

            scene.add(this.mesh);
        }

        update(time, blackHolePosition) {
            this.mesh.rotation.y += this.rotationSpeed;
            
            // Add floating motion
            this.mesh.position.y = Math.sin(time * this.orbitSpeed) * this.orbitRadius;
            
            // Black hole gravity effect
            const distanceToBlackHole = this.mesh.position.distanceTo(blackHolePosition);
            const gravity = Math.max(0, 1 - (distanceToBlackHole / 30));
            
            if (gravity > 0) {
                const direction = new THREE.Vector3().subVectors(blackHolePosition, this.mesh.position);
                direction.normalize();
                this.mesh.position.add(direction.multiplyScalar(gravity * 0.05));
            }
        }
    }

    // Create planets with specific colors and orbit parameters
    const planets = [
        new Planet(1.5, 0x4ca9ff, 15, 0.003, 0.002),  // Blue planet, larger orbit
        new Planet(1.2, 0xff6b6b, 10, 0.005, 0.003),  // Red planet, medium orbit
        new Planet(0.8, 0x64ffda, 7, 0.007, 0.004),   // Cyan planet, small orbit
        new Planet(0.6, 0xffd700, 20, 0.002, 0.005)   // Gold planet, outer orbit
    ];

    // Responsive scene adjustments
    function updateSceneForScreenSize() {
        const isMobile = window.innerWidth <= 768;
        const scale = isMobile ? 1.5 : 1;
        
        // Adjust camera
        camera.position.z = isMobile ? 25 : 15;
        
        // Scale black hole and its effects
        blackHole.group.scale.set(scale, scale, scale);
        blackHole.group.position.z = isMobile ? -30 : -20;
        
        // Adjust planets
        planets.forEach((planet, index) => {
            const positions = isMobile ? [
                [-6, 3, -8],   // Blue planet
                [6, -3, -6],   // Red planet
                [3, 4, -10],   // Cyan planet
                [-4, -2, -8]   // Gold planet
            ] : [
                [-8, 4, -5],   // Blue planet
                [8, -4, -3],   // Red planet
                [4, 6, -8],    // Cyan planet
                [-6, -3, -6]   // Gold planet
            ];
            
            if (positions[index]) {
                planet.mesh.position.copy(new THREE.Vector3(...positions[index]));
            }
        });
        
        // Adjust star field
        stars.forEach(star => {
            if (isMobile) {
                star.mesh.position.multiplyScalar(1.5);
            }
        });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Update scene elements
        updateSceneForScreenSize();
    });

    // Initial scene setup
    updateSceneForScreenSize();

    // Performance optimizations
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4();

    // Optimize render loop
    function isInView(object) {
        matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix);
        return frustum.containsPoint(object.position);
    }

    // Enhanced animation loop with performance optimizations
    function animate() {
        requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        
        // Update controls
        controls.update();
        
        // Update black hole
        blackHole.update(time);
        
        // Update planets
        planets.forEach(planet => {
            planet.update(time, blackHole.group.position);
        });
        
        // Update stars with visibility optimization
        stars.forEach(star => {
            if (isInView(star.mesh)) {
                star.update();
            }
        });
        
        // Update camera based on mouse position
        camera.position.x += (mouse.target.x * 5 - camera.position.x) * 0.05;
        camera.position.y += (-mouse.target.y * 5 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);
        
        // Render the scene
        renderer.render(scene, camera);
    }

    // Animation loop
    const clock = new THREE.Clock();
    animate();

} catch (error) {
    console.error('Error in Three.js initialization:', error);
}

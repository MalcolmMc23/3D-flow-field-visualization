// Perlin Noise implementation
// Based on the improved noise algorithm by Ken Perlin
class PerlinNoise {
    constructor() {
        // Initialize permutation table
        this.p = new Uint8Array(512);
        this.permutation = new Uint8Array(256);

        // Fill permutation with values 0-255
        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }

        // Shuffle permutation array
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }

        // Duplicate the permutation array
        for (let i = 0; i < 512; i++) {
            this.p[i] = this.permutation[i & 255];
        }
    }

    // Linear interpolation
    lerp(t, a, b) {
        return a + t * (b - a);
    }

    // Fade function smooths out the final result
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    // Gradient function
    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    // 3D Perlin noise function
    noise(x, y, z) {
        // Find unit cube that contains the point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        // Find relative x, y, z of point in cube
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        // Compute fade curves for each of x, y, z
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        // Hash coordinates of the 8 cube corners
        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;

        // Add blended results from 8 corners of cube
        return this.lerp(w,
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA], x, y, z),
                    this.grad(this.p[BA], x - 1, y, z)
                ),
                this.lerp(u,
                    this.grad(this.p[AB], x, y - 1, z),
                    this.grad(this.p[BB], x - 1, y - 1, z)
                )
            ),
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA + 1], x, y, z - 1),
                    this.grad(this.p[BA + 1], x - 1, y, z - 1)
                ),
                this.lerp(u,
                    this.grad(this.p[AB + 1], x, y - 1, z - 1),
                    this.grad(this.p[BB + 1], x - 1, y - 1, z - 1)
                )
            )
        );
    }
}

// Main application class
class FlowField {
    constructor() {
        this.init();
        this.createParticles();
        this.animate();
    }

    init() {
        // Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 50;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);
        document.body.appendChild(this.renderer.domElement);

        // Add orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Setup Perlin noise
        this.perlin = new PerlinNoise();

        // Flow field settings
        this.fieldSize = 30;  // Size of the flow field cube
        this.particleCount = 5000;
        this.particleSpeed = 0.1;

        // Enhanced 3D noise settings
        this.noiseScale = {
            x: 0.1,
            y: 0.1,
            z: 0.15  // Increased z-scale for more vertical variation
        };

        // Secondary noise for 3D complexity
        this.secondaryNoiseScale = {
            x: 0.2,
            y: 0.2,
            z: 0.25
        };

        this.noiseInfluence = {
            primary: 0.7,
            secondary: 0.3
        };

        this.zInfluence = 1.5;  // How much the z-dimension affects the flow
        this.timeScale = 0.0005;  // Speed of animation
        this.time = 0;

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    createParticles() {
        // Create particles
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);

        for (let i = 0; i < this.particleCount; i++) {
            // Random position within the field size
            const x = (Math.random() - 0.5) * this.fieldSize;
            const y = (Math.random() - 0.5) * this.fieldSize;
            const z = (Math.random() - 0.5) * this.fieldSize;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Create color based on position
            const r = 0.5 + 0.5 * Math.sin(x * 0.1);
            const g = 0.5 + 0.5 * Math.sin(y * 0.1);
            const b = 0.5 + 0.5 * Math.sin(z * 0.1);

            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Create material
        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        // Create point system
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    updateParticles() {
        const positions = this.particles.geometry.attributes.position.array;
        const colors = this.particles.geometry.attributes.color.array;

        // Additional time-varying offset
        const timeOffset = this.time * 0.1;

        for (let i = 0; i < this.particleCount; i++) {
            const idx = i * 3;
            let x = positions[idx];
            let y = positions[idx + 1];
            let z = positions[idx + 2];

            // Primary 3D noise field
            const primaryNoise1 = this.perlin.noise(
                x * this.noiseScale.x,
                y * this.noiseScale.y,
                z * this.noiseScale.z * this.zInfluence + this.time
            );

            const primaryNoise2 = this.perlin.noise(
                x * this.noiseScale.x + 100,
                y * this.noiseScale.y + 100,
                z * this.noiseScale.z * this.zInfluence + 100 + this.time
            );

            // Secondary 3D noise field for complexity
            const secondaryNoise1 = this.perlin.noise(
                x * this.secondaryNoiseScale.x + 200,
                y * this.secondaryNoiseScale.y + 200,
                z * this.secondaryNoiseScale.z * this.zInfluence + 200 + timeOffset
            );

            const secondaryNoise2 = this.perlin.noise(
                x * this.secondaryNoiseScale.x + 300,
                y * this.secondaryNoiseScale.y + 300,
                z * this.secondaryNoiseScale.z * this.zInfluence + 300 + timeOffset
            );

            // Blend the noise fields
            const angle1 = (
                primaryNoise1 * this.noiseInfluence.primary +
                secondaryNoise1 * this.noiseInfluence.secondary
            ) * Math.PI * 2;

            const angle2 = (
                primaryNoise2 * this.noiseInfluence.primary +
                secondaryNoise2 * this.noiseInfluence.secondary
            ) * Math.PI;

            // Calculate a z-specific angle for more vertical flow variation
            const zAngle = this.perlin.noise(
                x * this.noiseScale.x + 400,
                y * this.noiseScale.y + 400,
                z * this.noiseScale.z + 400 + this.time
            ) * Math.PI * 0.5; // Half PI for more subtle vertical shifts

            // Convert spherical to cartesian coordinates with enhanced z influence
            const vx = Math.sin(angle1) * Math.cos(angle2);
            const vy = Math.sin(angle1) * Math.sin(angle2);
            const vz = Math.cos(angle1) + Math.sin(zAngle) * 0.5; // Add z-specific flow

            // Update position
            x += vx * this.particleSpeed;
            y += vy * this.particleSpeed;
            z += vz * this.particleSpeed;

            // Make particles wrap around when they hit the boundaries
            const halfSize = this.fieldSize / 2;

            // X-axis wrapping
            if (x > halfSize) {
                x = -halfSize + (x - halfSize);
            } else if (x < -halfSize) {
                x = halfSize - (Math.abs(x) - halfSize);
            }

            // Y-axis wrapping
            if (y > halfSize) {
                y = -halfSize + (y - halfSize);
            } else if (y < -halfSize) {
                y = halfSize - (Math.abs(y) - halfSize);
            }

            // Z-axis wrapping
            if (z > halfSize) {
                z = -halfSize + (z - halfSize);
            } else if (z < -halfSize) {
                z = halfSize - (Math.abs(z) - halfSize);
            }

            // Update position
            positions[idx] = x;
            positions[idx + 1] = y;
            positions[idx + 2] = z;

            // Update color based on Y position
            // Map y from [-halfSize, halfSize] to a color gradient
            const normalizedY = (y + halfSize) / this.fieldSize; // 0 to 1

            // Color gradient based on Y position
            // You can customize these color mappings as desired
            colors[idx] = 0.5 + 0.5 * Math.sin(normalizedY * Math.PI * 2); // Red
            colors[idx + 1] = normalizedY; // Green increases with height
            colors[idx + 2] = 1.0 - normalizedY; // Blue decreases with height
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.color.needsUpdate = true; // Mark colors for update

        // Update time
        this.time += this.timeScale;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.updateParticles();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the flow field when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    const flowField = new FlowField();
});

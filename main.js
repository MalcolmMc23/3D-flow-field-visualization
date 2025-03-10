const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
const particleCount = 2000;
const noiseScale = 0.005;
const particleSpeed = 1;
const colorMode = 'rainbow'; // 'rainbow', 'single', 'gradient'
const backgroundColor = '#121212';

// Initialize canvas and particles
function init() {
    // Set canvas size
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Create particles
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: 0,
            vy: 0,
            color: getRandomColor(),
            size: Math.random() * 2 + 1
        });
    }

    animate();
}

// Animation loop
function animate() {
    // Apply background with transparency for trails
    ctx.fillStyle = backgroundColor + '10'; // Adding alpha for trails
    ctx.fillRect(0, 0, width, height);

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Get flow field angle at particle position
        const angle = getFlowFieldAngle(p.x, p.y);

        // Update velocity based on flow field
        p.vx = Math.cos(angle) * particleSpeed;
        p.vy = Math.sin(angle) * particleSpeed;

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Reset particles that go off-screen
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    }

    requestAnimationFrame(animate);
}

// Generate flow field angle using Perlin-like noise
function getFlowFieldAngle(x, y) {
    // Simple noise function (can be replaced with a better noise implementation)
    const value = simplex(x * noiseScale, y * noiseScale, performance.now() * 0.0001);
    return value * Math.PI * 2;
}

// Simple noise function (approximation)
function simplex(x, y, z) {
    return Math.sin(x * 1.5 + z) * Math.cos(y * 1.3) * 0.5 +
        Math.sin(x * 0.7 - y * 0.8 + z * 1.1) * 0.5;
}

// Get random color based on chosen color mode
function getRandomColor() {
    if (colorMode === 'single') {
        return '#00AAFF'; // Single blue color
    } else if (colorMode === 'rainbow') {
        return `hsl(${Math.random() * 360}, 100%, 60%)`;
    } else {
        // Gradient between two colors
        const hue = 200 + Math.random() * 60; // Blue to purple range
        return `hsl(${hue}, 100%, 60%)`;
    }
}

// Handle window resize
window.addEventListener('resize', init);

// Start animation
init();

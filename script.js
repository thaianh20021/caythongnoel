const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingScreen = document.querySelector('.container');

// Particle Config
const particles = [];
const PARTICLE_COUNT_PER_FRAME = 5;
const GRAVITY = 0.15;
const DRAG = 0.98;
const FADE_SPEED = 0.015;

const colors = [
    '255, 215, 0',   // Gold
    '255, 0, 0',     // Red
    '0, 255, 0',     // Green
    '255, 255, 255', // White
    '135, 206, 235'  // Sky Blue (Ice)
];

// Helper to resize canvas
function resizeCanvas() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2; // Burst speed
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        this.vy += GRAVITY; // Gravity
        this.vx *= DRAG;
        this.vy *= DRAG;
        
        this.life -= FADE_SPEED;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = `rgb(${this.color})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgb(${this.color})`;
        ctx.fill();
        
        ctx.restore();
    }
}

// Particle System Manager
function emitParticles(x, y) {
    for (let i = 0; i < PARTICLE_COUNT_PER_FRAME; i++) {
        particles.push(new Particle(x, y));
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const p of particles) {
        p.draw(canvasCtx);
    }
}

// MediaPipe Hands Setup
function onResults(results) {
    loadingScreen.classList.add('loaded'); // Hide loading spinner

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw Camera Feed (Optional: comment out to have black background with particles only)
    // Mirror the video draw for natural feel
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);
    // Draw image to fill the screen (cover)
    // We need to calculate aspect ratios to simpler 'cover' fit
    // For simplicity in this demo, we stretch or just center. 
    // Let's just draw to fill for now to keep it immersive.
    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    canvasCtx.restore(); // Restore coordinate system for drawing overlays

    // Draw Hands and Emit Particles
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            // landmarks is an array of 21 points.
            // 8 is the index finger tip.
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            const middleTip = landmarks[12];

            // Convert normalized coordinates (0-1) to pixel coordinates
            // Note: Since we flipped the video using CSS transform scaleX(-1), 
            // the canvas drawing coordinates for particles must line up with the visual.
            // However, the results from MediaPipe are based on the original image.
            // If we drew the image flipped in canvas (lines 99-101), we need to flip the x coord too when tracking.
            const x = (1 - indexTip.x) * canvasElement.width; // Flip X
            const y = indexTip.y * canvasElement.height;

            // Emit particles at index finger tip
            emitParticles(x, y);
            
            // Optional: Draw skeleton helper
            // drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
            // drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1});
        }
    }

    updateParticles();
    drawParticles();
}

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// Camera Setup
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480 // Lower resolution for better performance, scaled up in canvas
});

camera.start().catch((err) => {
    console.error("Error starting camera: ", err);
    alert("Không thể mở camera. Vui lòng cấp quyền truy cập!");
});

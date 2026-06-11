const canvas = document.getElementById('optics-canvas');
const ctx = canvas.getContext('2d');

const p1YInput = document.getElementById('p1-y');
const p1RotInput = document.getElementById('p1-rot');
const p2YInput = document.getElementById('p2-y');
const p2RotInput = document.getElementById('p2-rot');
const btnReset = document.getElementById('btn-reset');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const state = {
    p1: { yOffset: 0, rotation: 0 },
    p2: { yOffset: 0, rotation: 0 } // Centrado por defecto para asegurar la recombinación inicial
};

const spectrum = [
    { name: 'Rojo',     color: 'rgba(255, 0, 0, 0.85)',    offsetFactor: -3.5 },
    { name: 'Naranja',  color: 'rgba(255, 120, 0, 0.85)',  offsetFactor: -2.3 },
    { name: 'Amarillo', color: 'rgba(255, 240, 0, 0.85)',  offsetFactor: -1.1 },
    { name: 'Verde',    color: 'rgba(0, 240, 0, 0.85)',    offsetFactor: 0.1 },
    { name: 'Azul',     color: 'rgba(0, 100, 255, 0.85)',  offsetFactor: 1.3 },
    { name: 'Índigo',   color: 'rgba(75, 0, 180, 0.85)',   offsetFactor: 2.5 },
    { name: 'Violeta',  color: 'rgba(150, 0, 230, 0.85)',  offsetFactor: 3.7 }
];

// Comprobación geométrica robusta basada en la posición Y relativa
function isInsidePrism2(py, cy, side) {
    const h = side * (Math.sqrt(3) / 2);
    const topY = cy - h / 2;
    const bottomY = cy + h / 2;
    // Verifica si el rayo entra en el rango vertical del Prisma 2
    return py >= topY && py <= bottomY;
}

function drawPrismShape(centerX, centerY, side, invert = false, rotationDeg = 0) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotationDeg * Math.PI) / 180);

    ctx.beginPath();
    const h = side * (Math.sqrt(3) / 2);

    if (!invert) {
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(side / 2, h / 2);
        ctx.lineTo(-side / 2, h / 2);
    } else {
        ctx.moveTo(0, h / 2);
        ctx.lineTo(side / 2, -h / 2);
        ctx.lineTo(-side / 2, -h / 2);
    }
    ctx.closePath();

    const grad = ctx.createLinearGradient(-side/2, -h/2, side/2, h/2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1, 'rgba(170, 210, 255, 0.22)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

function render() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const midX = canvas.width / 2;
    const midY = canvas.height / 2;

    const prismSide = Math.min(canvas.width * 0.14, 160);
    const p1CenterX = midX - prismSide * 1.3;
    const p2CenterX = midX + prismSide * 0.8; 

    const p1Y = midY + state.p1.yOffset;
    const p2Y = midY + state.p2.yOffset;

    // --- HAZ DE LUZ BLANCA ENTRANTE ---
    const startX = 0;
    const startY = midY - 20; 
    const p1HitX = p1CenterX - prismSide / 4;
    const p1HitY = p1Y - 10 + (state.p1.rotation * 0.3);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(p1HitX, p1HitY);
    ctx.stroke();
    ctx.shadowBlur = 0; 

    const p1ExitX = p1CenterX + prismSide * 0.3;

    // Parámetros de la cara izquierda de entrada del Prisma 2
    const p2FaceLeftX = p2CenterX - prismSide / 2;
    
    // Punto de convergencia (recombinación) en la cara derecha del Prisma 2
    const p2ExitX = p2CenterX + prismSide * 0.15;
    const p2RecombinationY = p2Y + (state.p2.rotation * 0.5); 

    let totalRaysHitting = 0;

    spectrum.forEach((ray) => {
        const p1InternalExitY = p1Y + 5 + (ray.offsetFactor * 2) + (state.p1.rotation * 0.4);

        // 1. Dibujar espectro interno dentro del Prisma 1
        ctx.strokeStyle = ray.color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(p1HitX, p1HitY);
        ctx.lineTo(p1ExitX, p1InternalExitY);
        ctx.stroke();

        // Calcular trayectoria hacia el Prisma 2
        const dynamicSlope = 0.12 + (ray.offsetFactor * 0.035) + (state.p1.rotation * 0.02);
        const p2ArrivalY = p1InternalExitY + (p2FaceLeftX - p1ExitX) * dynamicSlope;

        // Validamos si este rayo en particular entra al Prisma 2
        const hitsPrism2 = isInsidePrism2(p2ArrivalY, p2Y, prismSide);

        if (hitsPrism2) {
            totalRaysHitting++;

            // 2. Trayecto de color desde Prisma 1 hasta la cara del Prisma 2
            ctx.beginPath();
            ctx.moveTo(p1ExitX, p1InternalExitY);
            ctx.lineTo(p2FaceLeftX, p2ArrivalY);
            ctx.stroke();

            // 3. DENTRO DEL PRISMA 2: Convergencia hacia el punto de salida común
            ctx.beginPath();
            ctx.moveTo(p2FaceLeftX, p2ArrivalY);
            ctx.lineTo(p2ExitX, p2RecombinationY);
            ctx.stroke();
        } else {
            // Si el prisma se mueve y el rayo no entra, sigue de largo en su propio ángulo
            const endX = canvas.width;
            const cleanPassY = p1InternalExitY + (endX - p1ExitX) * dynamicSlope;

            ctx.beginPath();
            ctx.moveTo(p1ExitX, p1InternalExitY);
            ctx.lineTo(endX, cleanPassY);
            ctx.stroke();
        }
    });

    // --- RECOMBINACIÓN: HAZ DE LUZ BLANCA SALIENTE ---
    // Si la mayoría de los rayos (o todos) logran entrar al segundo prisma, se forma la luz blanca de nuevo
    if (totalRaysHitting >= 4) {
        const endX = canvas.width;
        // El ángulo de salida se neutraliza simulando la refracción inversa exacta
        const finalSlope = 0.02 + (state.p1.rotation * 0.02) - (state.p2.rotation * 0.035);
        const p2FinalY = p2RecombinationY + (endX - p2ExitX) * finalSlope;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(p2ExitX, p2RecombinationY);
        ctx.lineTo(endX, p2FinalY);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Dibujar los prismas geométricos por encima de la luz para un acabado limpio
    drawPrismShape(p1CenterX, p1Y, prismSide, false, state.p1.rotation);
    drawPrismShape(p2CenterX, p2Y, prismSide, true, state.p2.rotation);

    requestAnimationFrame(render);
}

p1YInput.addEventListener('input', (e) => state.p1.yOffset = parseFloat(e.target.value));
p1RotInput.addEventListener('input', (e) => state.p1.rotation = parseFloat(e.target.value));
p2YInput.addEventListener('input', (e) => state.p2.yOffset = parseFloat(e.target.value));
p2RotInput.addEventListener('input', (e) => state.p2.rotation = parseFloat(e.target.value));

btnReset.addEventListener('click', () => {
    state.p1.yOffset = 0;
    state.p1.rotation = 0;
    state.p2.yOffset = 0;
    state.p2.rotation = 0;

    p1YInput.value = 0;
    p1RotInput.value = 0;
    p2YInput.value = 0;
    p2RotInput.value = 0;
});

// Forzamos el estado inicial alineado
state.p2.yOffset = 0;
p2YInput.value = 0;

render();

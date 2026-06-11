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
    p2: { yOffset: 0, rotation: 0 } // Cambiado por defecto a 0 para alineación perfecta
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

function isInsidePrism2(px, py, cx, cy, side, rotationDeg) {
    const rad = (-rotationDeg * Math.PI) / 180;
    const dx = px - cx;
    const dy = py - cy;
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

    const h = side * (Math.sqrt(3) / 2);
    const topY = -h / 2;
    const bottomY = h / 2;

    if (ry < topY || ry > bottomY) return false;

    const fraction = (ry - topY) / h;
    const maxWidthAtY = side * fraction; // Corregido para prisma invertido

    return Math.abs(rx) <= maxWidthAtY / 2;
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
    }
    ctx.lineTo(-side / 2, -h / 2);
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
    const p2CenterX = midX + prismSide * 0.9; // Separación levemente optimizada

    const p1Y = midY + state.p1.yOffset;
    const p2Y = midY + state.p2.yOffset;

    // 1. Haz de luz blanca original
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

    // Variables para calcular el punto de reunión de la luz blanca
    let allRaysHitPrism2 = true;
    const p2ExitX = p2CenterX + prismSide * 0.15;
    // El punto de convergencia dinámica basado en la rotación del Prisma 2
    const p2RecombinationY = p2Y - 5 + (state.p2.rotation * 0.5); 

    spectrum.forEach((ray) => {
        const p1InternalExitY = p1Y + 5 + (ray.offsetFactor * 2) + (state.p1.rotation * 0.4);

        // Dibujar espectro interno Prisma 1
        ctx.strokeStyle = ray.color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(p1HitX, p1HitY);
        ctx.lineTo(p1ExitX, p1InternalExitY);
        ctx.stroke();

        // Trayecto entre Prisma 1 y Prisma 2
        const stepX = p2CenterX - prismSide * 0.4;
        const dynamicSlope = 0.12 + (ray.offsetFactor * 0.035) + (state.p1.rotation * 0.02);
        const p2ArrivalY = p1InternalExitY + (stepX - p1ExitX) * dynamicSlope;

        const hitsPrism2 = isInsidePrism2(stepX, p2ArrivalY, p2CenterX, p2Y, prismSide, state.p2.rotation);

        if (!hitsPrism2) {
            allRaysHitPrism2 = false;
        }

        if (hitsPrism2) {
            // Rayo de color va desde la salida del P1 hasta la cara del P2
            ctx.beginPath();
            ctx.moveTo(p1ExitX, p1InternalExitY);
            ctx.lineTo(stepX, p2ArrivalY);
            ctx.stroke();

            // DENTRO DEL PRISMA 2: Los rayos convergen hacia el punto de recombinación
            ctx.beginPath();
            ctx.moveTo(stepX, p2ArrivalY);
            ctx.lineTo(p2ExitX, p2RecombinationY);
            ctx.stroke();
        } else {
            // Si no toca el prisma 2, el color sigue de largo de forma infinita
            const endX = canvas.width;
            const cleanPassY = p1InternalExitY + (endX - p1ExitX) * dynamicSlope;

            ctx.beginPath();
            ctx.moveTo(p1ExitX, p1InternalExitY);
            ctx.lineTo(endX, cleanPassY);
            ctx.stroke();
        }
    });

    // 2. Haz de luz blanca recombinada saliendo del Prisma 2
    // Solo se genera si todos los colores lograron ingresar y recombinarse correctamente
    if (allRaysHitPrism2) {
        const endX = canvas.width;
        // El ángulo de salida se equilibra de forma horizontal gracias a la inversión del prisma
        const finalSlope = 0.0 + (state.p1.rotation * 0.02) - (state.p2.rotation * 0.03);
        const p2FinalY = p2RecombinationY + (endX - p2ExitX) * finalSlope;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(p2ExitX, p2RecombinationY);
        ctx.lineTo(endX, p2FinalY);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Dibujar las geometrías de los prismas por encima de la luz
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
    state.p2.yOffset = 0; // Cambiado a 0 para que por defecto empiece alineado y recombinando
    state.p2.rotation = 0;

    p1YInput.value = 0;
    p1RotInput.value = 0;
    p2YInput.value = 0;
    p2RotInput.value = 0;
});

// Inicialización corregida para que empiece alineado
state.p2.yOffset = 0;
p2YInput.value = 0;

render();

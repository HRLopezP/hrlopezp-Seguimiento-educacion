import React from 'react';
import "../styles/GaugeProgress.css" // Asegúrate de tener este CSS

const GaugeProgress = ({ percentage, color, size = 130 }) => {
    // Configuración del semicírculo
    const radius = 80; // Radio del arco
    const cx = 100;    // Centro X
    const cy = 100;    // Centro Y
    const strokeWidth = 10;
    const tickWidth = 2.5; // Grosor de cada línea entrecortada
    const tickLength = 10; // Largo de cada línea entrecortada

    // Cálculos para las líneas entrecortadas (ticks)
    // El arco es de 180 grados, por lo que dividimos en ticks
    const totalTicks = 50; 
    
    // Función para dibujar los ticks (líneas entrecortadas)
    const renderTicks = (filled = false) => {
        const ticks = [];
        for (let i = 0; i <= totalTicks; i++) {
            // Ángulo de cada tick (-180 a 0 grados)
            const angle = (i / totalTicks) * 180 - 180;
            const radians = (angle * Math.PI) / 180;
            
            // Coordenadas de inicio y fin del tick
            const x1 = cx + (radius - tickLength / 2) * Math.cos(radians);
            const y1 = cy + (radius - tickLength / 2) * Math.sin(radians);
            const x2 = cx + (radius + tickLength / 2) * Math.cos(radians);
            const y2 = cy + (radius + tickLength / 2) * Math.sin(radians);
            
            // Color de fondo o color dinámico
            let tickColor = filled ? color : "#e9ecef"; // Gris tenue si no está lleno
            
            // Si es relleno, solo dibujar los ticks hasta el porcentaje indicado
            if (filled && i / totalTicks > percentage / 100) {
                tickColor = "transparent"; // No dibujar
            }

            ticks.push(
                <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={tickColor}
                    strokeWidth={tickWidth}
                    strokeLinecap="round"
                />
            );
        }
        return ticks;
    };

    // Cálculos para la Aguja (Needle) - Misma lógica de rotación
    const needleRotation = (percentage / 100) * 180 - 90;
    const needlePath = `M ${cx - 2} ${cy} L ${cx} ${cy - radius + 15} L ${cx + 2} ${cy} Z`;

    return (
        <div className="gauge-container" style={{ width: size, height: size / 1.4, overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 200 120">

                {/* A. El Fondo del Dial (Ticks Grises entrecortados) */}
                <g>{renderTicks(false)}</g>

                {/* B. El Progreso del Dial (Ticks Coloreados entrecortados) */}
                <g>{renderTicks(true)}</g>

                {/* C. La Aguja (Needle) */}
                <path
                    d={needlePath}
                    fill="#14213d" /* Oxford Grey institucional */
                    className="gauge-needle"
                    style={{
                        transform: `rotate(${needleRotation}deg)`,
                        transformOrigin: `${cx}px ${cy}px`,
                        transition: 'transform 0.8s ease-out'
                    }}
                />

                {/* D. El Punto Central (Eje) */}
                <circle cx={cx} cy={cy} r="6" fill="#14213d" stroke="white" strokeWidth="2" />

                {/* E. Texto de Porcentaje (Separado de la aguja) */}
                <text
                    x={cx}
                    y={cy + 30} /* REQUISITO: Bajado significativamente para separar */
                    textAnchor="middle"
                    className="gauge-text"
                    fontSize="32" /* Ajustado el tamaño para legibilidad */
                >
                    {`${percentage.toFixed(0)}%`}
                </text>
            </svg>
        </div>
    );
};

export default GaugeProgress;
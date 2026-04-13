import React from 'react';
import "../styles/GaugeProgress.css"

const GaugeProgress = ({ percentage, size = 130 }) => {
    const radius = 80;
    const cx = 100;
    const cy = 100;
    const tickWidth = 3; // Un pelín más grueso para soportar el brillo
    const tickLength = 10;
    const totalTicks = 50; 

    const getStaticColor = (index, isActive) => {
        const ratio = index / totalTicks;
        const opacity = isActive ? "1" : "0.45"; 

        if (ratio <= 0.25) return `rgba(239, 68, 68, ${opacity})`;   // Rojo
        if (ratio <= 0.50) return `rgba(243, 156, 18, ${opacity})`;  // Naranja
        if (ratio <= 0.80) return `rgba(58, 134, 255, ${opacity})`;  // Azul
        return `rgba(16, 185, 129, ${opacity})`;                    // Esmeralda
    };

    const renderTicks = () => {
        const ticks = [];
        for (let i = 0; i <= totalTicks; i++) {
            const angle = (i / totalTicks) * 180 - 180;
            const radians = (angle * Math.PI) / 180;
            const x1 = cx + (radius - tickLength / 2) * Math.cos(radians);
            const y1 = cy + (radius - tickLength / 2) * Math.sin(radians);
            const x2 = cx + (radius + tickLength / 2) * Math.cos(radians);
            const y2 = cy + (radius + tickLength / 2) * Math.sin(radians);
            
            const isReached = (i / totalTicks) <= (percentage / 100);
            const tickColor = getStaticColor(i, isReached);

            ticks.push(
                <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={tickColor}
                    strokeWidth={tickWidth}
                    strokeLinecap="round"
                    // Aplicamos el filtro de iluminación solo a los activos
                    filter={isReached ? "url(#neonGlow)" : "none"}
                    style={{ transition: 'stroke 0.4s ease' }}
                />
            );
        }
        return ticks;
    };

    const needleRotation = (percentage / 100) * 180 - 90;

    return (
        <div className="gauge-container" style={{ width: size, height: size / 1.4, overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 200 120">
                <defs>
                    {/* Filtro de Neón: Combina desenfoque y brillo extra */}
                    <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                        {/* Crea el aura de luz alrededor del color */}
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g>{renderTicks()}</g>

                {/* Aguja en Oxford Grey institucional */}
                <path
                    d={`M ${cx - 2} ${cy} L ${cx} ${cy - radius + 15} L ${cx + 2} ${cy} Z`}
                    fill="#14213d" 
                    style={{
                        transform: `rotate(${needleRotation}deg)`,
                        transformOrigin: `${cx}px ${cy}px`,
                        transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                />

                <circle cx={cx} cy={cy} r="6" fill="#14213d" stroke="white" strokeWidth="2" />

                <text x={cx} y={cy + 30} textAnchor="middle" fontSize="34" fontWeight="900" fill="#14213d">
                    {`${percentage.toFixed(0)}%`}
                </text>
            </svg>
        </div>
    );
};

export default GaugeProgress;
import React from 'react';

const GraduatedGauge = ({ percentage, color, size = 150 }) => {
  // Configuración del semicírculo
  const radius = 80; // Radio del arco
  const cx = 100;    // Centro X
  const cy = 100;    // Centro Y
  const totalTicks = 50; // Cantidad de líneas en el arco
  const tickLength = 10;
  
  // El ángulo de un semicírculo es 180 grados.
  // Gira la aguja desde -90 grados (0%) hasta +90 grados (100%)
  const needleRotation = (percentage / 100) * 180 - 90;

  // Función para dibujar las líneas graduadas
  const renderTicks = () => {
    const ticks = [];
    for (let i = 0; i <= totalTicks; i++) {
      const angle = (i / totalTicks) * 180 - 90;
      const radians = (angle * Math.PI) / 180;
      
      const x1 = cx + (radius - tickLength) * Math.cos(radians);
      const y1 = cy + (radius - tickLength) * Math.sin(radians);
      const x2 = cx + radius * Math.cos(radians);
      const y2 = cy + radius * Math.sin(radians);
      
      // Determina el color del tick basado en la posición
      // Similar al de referencia que va de verde a rojo
      let tickColor = "#e9ecef"; // Gris base
      if (i / totalTicks <= percentage / 100) {
        if (percentage <= 25) tickColor = "#ef4444"; // Críticos (Rojo)
        else if (percentage <= 50) tickColor = "#f39c12"; // Bajos (Amarillo)
        else if (percentage <= 80) tickColor = "#3a86ff"; // Progreso (Azul)
        else tickColor = "#10b981"; // Avanzados (Verde)
      }

      ticks.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={tickColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
    }
    return ticks;
  };

  return (
    <div className="graduated-gauge-container" style={{ width: size, height: size / 1.5 }}>
      {/* Usamos viewBox 0 0 200 120 para tener espacio de dibujo */}
      <svg width="100%" height="100%" viewBox="0 0 200 120">
        
        {/* A. El Dial Base (Arco de ticks grises) */}
        <g>{renderTicks()}</g>

        {/* B. La Aguja (Needle) */}
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - radius + tickLength * 1.5}
          stroke="#14213d" /* Oxford Grey para que resalte */
          strokeWidth="3"
          strokeLinecap="round"
          style={{ 
            transform: `rotate(${needleRotation}deg)`,
            transformOrigin: `${cx}px ${cy}px`, // Gira desde el centro inferior
            transition: 'transform 1s ease-out' // Animación suave
          }}
        />
        
        {/* C. El Punto Central (Eje) */}
        <circle cx={cx} cy={cy} r="6" fill="#14213d" stroke="white" strokeWidth="2"/>

        {/* D. Texto de Porcentaje (Abajo en el centro) */}
        <text 
            x={cx} 
            y={cy + 18} 
            textAnchor="middle" 
            className="graduated-gauge-text" 
            fontSize="16"
        >
            {`${percentage.toFixed(1)}%`}
        </text>
      </svg>
    </div>
  );
};

export default GraduatedGauge;
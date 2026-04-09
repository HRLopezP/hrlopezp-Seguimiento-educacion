import React from 'react';
import "../styles/radial-progress.css"



const RadialProgress = ({ percentage, color, size = 100, strokeWidth = 8 }) => {
  // Cálculos para el círculo SVG
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="radial-progress-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Círculo de fondo (Sombra/Guía) */}
        <circle
          className="radial-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Círculo de progreso (El velocímetro real) */}
        <circle
          className="radial-meter"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Texto central */}
        <text
          x="50%"
          y="50%"
          dy=".3em"
          textAnchor="middle"
          className="radial-text"
          style={{ fontSize: size * 0.2 }}
        >
          {`${percentage.toFixed(1)}%`}
        </text>
      </svg>
    </div>
  );
};

export default RadialProgress;
import React, { useEffect, useState, useRef } from "react";
import styled, { keyframes, css } from "styled-components";

// Keyframe animation for the loading line
const loadingLineAnim = keyframes`
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column; /* To stack the text and the loading line */
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  position: relative; /* Needed for absolute positioning of the loading line */

  ${(props) =>
    !props.$isTransparent &&
    css`
      background-color: #f0f0f0; /* Default background if not transparent */
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    `}
`;

const Char = styled.span`
  display: inline-block;
  font-weight: bold;
  transition: transform 0.1s ease, opacity 0.1s ease;
  z-index: 1; /* Ensure text is above the loading line */
`;

const LoadingLine = styled.div`
  position: absolute;
  bottom: 10px; /* Position it below the text */
  width: 80%; /* Adjust width as needed */
  height: 4px;
  background-color: ${(props) => props.$lineColor || "#3b82f6"};
  border-radius: 2px;
  overflow: hidden; /* Hide the overflowing part of the animation */

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent,
      ${(props) => props.$lineColor || "#3b82f6"},
      transparent
    );
    animation: ${loadingLineAnim} 1.5s infinite linear;
  }
`;

const Loading = ({
  text = "Loading...",
  waveSpeed = 0,
  waveHeight = 0,
  fontSize = 32,
  color = "#3b82f6",
  letterSpacing = 1,
  enableFlicker = true,
  flickerIntensity = 0.7,
  flickerSpeed = 0.5,
  isTransparent = false, // New prop for transparency
  background = "#f0f0f0", // New prop for background color
  lineColor = "#3b82f6", // New prop for loading line color
  showLoadingLine = true, // New prop to control visibility of the loading line
}) => {
  const [phase, setPhase] = useState(0);
  const [flickerValues, setFlickerValues] = useState([]);
  const animationRef = useRef();
  const startTimeRef = useRef();
  const lastFlickerUpdateRef = useRef(0);

  useEffect(() => {
    setFlickerValues(Array.from({ length: text.length }, () => 1));
  }, [text]);

  useEffect(() => {
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;

      setPhase(elapsed * waveSpeed * 0.01);

      // Flicker logic
      if (
        enableFlicker &&
        elapsed - lastFlickerUpdateRef.current > 1000 / flickerSpeed
      ) {
        lastFlickerUpdateRef.current = elapsed;
        setFlickerValues(
          flickerValues.map(() =>
            Math.random() > flickerIntensity ? 1 : Math.random() * 0.6 + 0.4
          )
        );
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [waveSpeed, flickerSpeed, flickerIntensity, enableFlicker, flickerValues]);

  return (
    <Wrapper
      $isTransparent={isTransparent}
      style={{ backgroundColor: isTransparent ? "transparent" : background }}
    >
      {text.split("").map((char, index) => {
        const yOffset = Math.sin(phase + index * 0.4) * waveHeight;
        const opacity = enableFlicker ? flickerValues[index] || 1 : 1;

        return (
          <Char
            key={index}
            style={{
              transform: `translateY(${yOffset}px)`,
              fontSize: `${fontSize}px`,
              color,
              marginRight: `${letterSpacing}px`,
              opacity,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </Char>
        );
      })}
      {showLoadingLine && <LoadingLine $lineColor={lineColor} />}
    </Wrapper>
  );
};

export default Loading;
// <Loading
//   text="Custom Loader"
//   waveSpeed={0.06}
//   waveHeight={6}
//   fontSize={40}
//   color="#8e24aa"
//   letterSpacing={2}
//   enableFlicker={false}
//   background="#ffe0b2"
//   lineColor="#d84315"
// />

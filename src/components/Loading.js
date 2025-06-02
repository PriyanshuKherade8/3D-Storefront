import { Box, height, width } from "@mui/system";
import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 40px 20px;
`;

const Char = styled.span`
  display: inline-block;
  font-weight: bold;
  transition: transform 0.1s ease, opacity 0.1s ease;
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
  isTransparent = false,
  backgroundColor = "#000000",
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
    <Box
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Wrapper>
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
      </Wrapper>
    </Box>
  );
};

export default Loading;

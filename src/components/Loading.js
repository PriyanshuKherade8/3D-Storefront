import { Box } from "@mui/system";
import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 0px 20px;
`;

const Char = styled.span`
  display: inline-block;
  font-weight: bold;
  transition: transform 0.1s ease, opacity 0.1s ease;
`;

const SliderWrapper = styled(Box)`
  display: flex;
  justify-content: flex-start;
  width: 100%;
  max-width: 300px;
  height: 6px;
  background-color: rgba(35, 62, 139, 0.2);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  margin-top: 10px; /* Increased margin to separate from text */

  @media (max-width: 768px) {
    width: 90%;
    max-width: 350px;
  }
`;

const Slider = styled.div`
  width: ${(props) => props.width}%;
  height: 100%; /* Changed to 100% to fill SliderWrapper height */
  background-color: #192b61;
  border-radius: 6px;
  box-shadow: 0px 3px 10px rgba(35, 62, 139, 0.5);
  transition: width 2s ease-in-out;
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
  const [sliderWidth, setSliderWidth] = useState(0);
  const animationRef = useRef();
  const startTimeRef = useRef();
  const lastFlickerUpdateRef = useRef(0);

  useEffect(() => {
    setFlickerValues(Array.from({ length: text.length }, () => 1));
  }, [text]);

  useEffect(() => {
    setSliderWidth(100);
  }, []); // Run once on mount to trigger slider animation

  useEffect(() => {
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;

      setPhase(elapsed * waveSpeed * 0.01);

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
        backgroundColor: isTransparent ? "transparent" : backgroundColor, // Apply background conditionally
      }}
    >
      <Box
        style={{
          display: "flex",
          flexDirection: "column", // Arrange children vertically
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
        <SliderWrapper>
          <Slider width={sliderWidth} />
        </SliderWrapper>
      </Box>
    </Box>
  );
};

export default Loading;

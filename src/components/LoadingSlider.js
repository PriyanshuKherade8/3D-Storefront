import { Box } from "@mui/material";
import React, { useEffect, useState } from "react";
import { styled } from "styled-components";

const LoadingScreen = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: #f7f7f7;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  flex-direction: column;
  animation: fadeIn 1s ease-in-out;
`;

const LoadingContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-top: -8%;

  @media (max-width: 768px) {
    margin-top: -5%; /* Adjust for smaller screens */
  }
`;

const ImageContainer = styled.img`
  max-width: 600px;
  height: auto;
  animation: fadeInUp 1.5s ease-in-out;

  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    max-width: 100%; /* Ensure the image is responsive */
    padding: 0 10px; /* Add some padding on mobile */
  }
`;

const LoadingText = styled(Box)`
  color: #233e8b;
  font-size: 18px;
  font-weight: 500;
  margin-top: 15px;
  text-align: center;
  opacity: 1;
  animation: fadeInText 1s ease-in-out forwards;
  animation-delay: 1s;

  @media (max-width: 768px) {
    font-size: 16px; /* Adjust text size for mobile */
    margin-top: 10px;
  }
`;

const SliderWrapper = styled(Box)`
  display: flex;
  justify-content: flex-start;
  width: 80%;
  max-width: 300px;
  height: 6px;
  background-color: rgba(35, 62, 139, 0.2);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  margin-top: 10px;

  @media (max-width: 768px) {
    width: 90%; /* Make the slider a bit wider on smaller screens */
    max-width: 350px;
  }
`;

const Slider = styled.div`
  width: ${(props) => props.width}%;
  height: 80%;
  background-color: #233e8b;
  border-radius: 6px;
  box-shadow: 0px 3px 10px rgba(35, 62, 139, 0.5);
  transition: width 2s ease-in-out;
`;

const LoadingSlider = () => {
  const [sliderWidth, setSliderWidth] = useState(0);

  useEffect(() => {
    setTimeout(() => {
      setSliderWidth(100);
    }, 500);
  }, []);

  return (
    <LoadingScreen>
      <LoadingContainer>
        <SliderWrapper>
          <Slider width={sliderWidth} />
        </SliderWrapper>
      </LoadingContainer>
    </LoadingScreen>
  );
};

export default LoadingSlider;

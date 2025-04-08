import React, { useState, useEffect } from "react";
import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useGetProductListData } from "../services";

const getScreenTypeValue = (screenWidth, screenHeight) => {
  const aspectRatio = screenWidth / screenHeight;
  return aspectRatio >= 1 ? "01" : "02";
};

const StorefrontLayout = () => {
  const { data: storeData } = useGetProductListData();
  const storefrontData = storeData?.data;

  const [screenType, setScreenType] = useState(() =>
    getScreenTypeValue(window.innerWidth, window.innerHeight)
  );

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const newType = getScreenTypeValue(screenWidth, screenHeight);
      setScreenType(newType);
    };

    window.addEventListener("resize", handleResize);

    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function getValueByScreenType(dataArray, screenTypeId) {
    if (!Array.isArray(dataArray)) return null;
    return (
      dataArray.find((item) => item.screen_type_id === screenTypeId) || null
    );
  }

  function getPropValue(dataArray, screenTypeId, fallback = null) {
    const match = getValueByScreenType(dataArray, screenTypeId);
    return match?.value ?? fallback;
  }

  function computeElementLayout(
    element,
    screenTypeId,
    parentWidth,
    parentHeight
  ) {
    const sizeObj = getValueByScreenType(element.size, screenTypeId);
    const positionObj = getValueByScreenType(element.position, screenTypeId);

    const width = parseFloat(sizeObj?.x || 0) * parentWidth;
    const height = parseFloat(sizeObj?.y || 0) * parentHeight;
    const top = parseFloat(positionObj?.top || 0) * parentHeight;
    const left = parseFloat(positionObj?.left || 0) * parentWidth;

    const computedElement = {
      element_id: element.element_id,
      type: element.type,
      size: { width, height },
      position: { top, left },
      children: [],
    };

    const hasChildren =
      Array.isArray(element.children) && element.children.length > 0;

    if (Array.isArray(element.children) && element.children.length > 0) {
      // Recursive call for children, pass current element's width and height as parent size
      computedElement.children = element.children.map((child) =>
        computeElementLayout(child, screenTypeId, width, height)
      );
    }

    // Assign props only for leaf elements (those without children)
    if (!element.children || element.children.length === 0) {
      const commonProps = {
        background_color: getPropValue(
          element.background_color,
          screenTypeId,
          "transparent"
        ),
        object_fit: element.object_fit || "cover",
        path: getValueByScreenType(element.path, screenTypeId)?.path || "",
      };

      if (element.type === "text" || element.type === "heading") {
        computedElement.props = {
          ...commonProps,
          text: getPropValue(element.text, screenTypeId, ""),
          font_size: getPropValue(element.font_size, screenTypeId, "16"),
          font_weight: getPropValue(element.font_weight, screenTypeId, "400"),
          font_style: getPropValue(element.font_style, screenTypeId, "normal"),
          font_color: getPropValue(element.font_color, screenTypeId, "#000000"),
          text_align: getPropValue(element.text_align, screenTypeId, "left"),
          line_height: getPropValue(
            element.line_height,
            screenTypeId,
            "normal"
          ),
          letter_spacing: getPropValue(
            element.letter_spacing,
            screenTypeId,
            "0px"
          ),
        };
      } else {
        // Fallback for other types like canvas, image, etc.
        computedElement.props = {
          ...commonProps,
        };
      }
    }

    return computedElement;
  }

  function generatePageLayout(
    storefrontData,
    screenTypeId,
    innerWidth,
    innerHeight
  ) {
    const elements = storefrontData?.storefront?.elements || [];
    return elements.map((element) =>
      computeElementLayout(element, screenTypeId, innerWidth, innerHeight)
    );
  }

  const pageLayout = generatePageLayout(
    storefrontData,
    screenType,
    window.innerWidth,
    window.innerHeight
  );
  console.log("zz", pageLayout);

  return (
    <Grid
      container
      sx={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Typography variant="h4">Screen Type: {screenType}</Typography>
    </Grid>
  );
};

export default StorefrontLayout;

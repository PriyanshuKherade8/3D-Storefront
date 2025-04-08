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
    return match?.value ?? match?.path ?? fallback;
  }

  function computeElementLayout(
    element,
    screenTypeId,
    parentWidth,
    parentHeight,
    elementIndex = 0
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
      element_index: elementIndex,
    };

    const hasChildren =
      Array.isArray(element.children) && element.children.length > 0;

    if (hasChildren) {
      computedElement.children = element.children.map((child, index) =>
        computeElementLayout(child, screenTypeId, width, height, index)
      );
    } else {
      const props = {};

      for (const key in element) {
        const val = element[key];
        console.log("val", val);

        if (Array.isArray(val) && val.length > 0 && val[0]?.screen_type_id) {
          const resolved = getPropValue(val, screenTypeId, null);
          if (resolved !== null) {
            props[key] = resolved;
          }
        } else if (
          typeof val === "object" &&
          val !== null &&
          !Array.isArray(val) &&
          Object.values(val).some(
            (v) => typeof v === "object" && v?.screen_type_id
          )
        ) {
          const resolved = getPropValue(Object.values(val), screenTypeId, null);
          if (resolved !== null) {
            props[key] = resolved;
          }
        } else if (
          typeof val === "string" ||
          typeof val === "number" ||
          typeof val === "boolean"
        ) {
          props[key] = val;
        }
      }

      computedElement.props = props;
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
    return elements.map((element, index) =>
      computeElementLayout(
        element,
        screenTypeId,
        innerWidth,
        innerHeight,
        index
      )
    );
  }

  const pageLayout = generatePageLayout(
    storefrontData,
    screenType,
    window.innerWidth,
    window.innerHeight
  );

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

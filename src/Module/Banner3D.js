import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
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

  function extractElementProps(element, screenTypeId) {
    const props = {};

    for (const key in element) {
      const val = element[key];

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

    return props;
  }

  function computeElementLayout(
    element,
    screenTypeId,
    parentWidth,
    parentHeight,
    elementIndex = 0,
    isChild = false
  ) {
    const sizeObj = getValueByScreenType(element.size, screenTypeId);
    const width = parseFloat(sizeObj?.x || 0) * parentWidth;
    const height = parseFloat(sizeObj?.y || 0) * parentHeight;

    const layout = {
      element_id: element.element_id,
      type: element.type,
      size: { width, height },
      element_index: elementIndex,
      props: extractElementProps(element, screenTypeId),
    };

    // Only compute position if it's a top-level element
    if (!isChild) {
      const positionObj = getValueByScreenType(element.position, screenTypeId);
      const top = parseFloat(positionObj?.top || 0) * parentHeight;
      const left = parseFloat(positionObj?.left || 0) * parentWidth;
      layout.position = { top, left };
    }

    // Recursively compute children layout
    if (Array.isArray(element.children) && element.children.length > 0) {
      layout.children = element.children.map((child, index) =>
        computeElementLayout(child, screenTypeId, width, height, index, true)
      );
    }

    return layout;
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
  console.log("pageLayout", pageLayout);

  const renderElement = (element) => {
    if (element.children && element.children.length > 0) {
      return element.children.map((child) => (
        <Grid
          key={child.element_id}
          sx={{
            width: child.size.width,
            height: child.size.height,
            zIndex: child.element_index,
          }}
          container
        >
          {renderElement(child)}
        </Grid>
      ));
    }

    switch (element.type) {
      case "image":
        return (
          <img
            src={element.props.path}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: element.props.object_fit || "cover",
              borderRadius: element.props.border_radius || 0,
            }}
          />
        );

      case "text":
        return (
          <Typography
            sx={{
              color: element.props.font_color,
              fontFamily: element.props.font_family,
              fontSize: parseFloat(element.props.font_size || "16"),
              fontWeight: element.props.font_weight,
              lineHeight: element.props.line_height,
              letterSpacing: element.props.letter_spacing,
              textAlign: element.props.text_align,
              backgroundColor: element.props.background_color || "transparent",
              border: element.props.is_border
                ? `${element.props.border || 1}px solid ${
                    element.props.border_color
                  }`
                : "none",
              width: "100%",
              height: "100%",
            }}
          >
            {element.props.text}
          </Typography>
        );

      case "canvas":
        return (
          <canvas
            style={{
              width: "100%",
              height: "100%",
              // border: element.props.is_border
              //   ? `${element.props.border}px solid ${element.props.border_color}`
              //   : "none",
              border: "1px solid red",
              borderRadius: element.props.border_radius || 0,
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {pageLayout.map((element) => (
        <Grid
          key={element.element_id}
          sx={{
            position: "absolute",
            top: element.position.top,
            left: element.position.left,
            width: element.size.width,
            height: element.size.height,
            zIndex: element.element_index,
          }}
          container
        >
          {renderElement(element)}
        </Grid>
      ))}
    </Box>
  );
};

export default StorefrontLayout;

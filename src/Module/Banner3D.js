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
  const sessionID = storefrontData?.sessionID;
  const itemsData = storefrontData?.storefront?.items;
  console.log("itemsData", itemsData);

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

  const getPolygonMapData = (elementId) => {
    const item = itemsData?.find((i) => i.element_id === elementId);
    if (!item || !item.map) return [];

    const screenSpecific = item.map.find(
      (m) => m.screen_type_id === screenType
    );
    return screenSpecific?.values || [];
  };

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

  const iframeUrl = `http://storefront.xculptor.io/?storefront=STR1000000001&product=01&session=${sessionID}`;

  const renderElement = (element) => {
    const {
      element_id,
      size,
      type,
      props = {},
      children,
      element_index,
      position,
    } = element;

    const {
      justify_content,
      align_items,
      direction,
      background_color,
      is_border,
      border,
      border_color,
      border_radius,
      is_transparent,
      margin_top,
      margin_bottom,
      margin_left,
      margin_right,
      padding_top,
      padding_bottom,
      padding_left,
      padding_right,
    } = props;

    const isTopLevel = position && typeof position === "object";

    const containerStyles = {
      width: size?.width,
      height: size?.height,
      zIndex: element_index,
      backgroundColor: is_transparent
        ? "transparent"
        : background_color || "transparent",
      border: is_border
        ? `${border || 1}px solid ${border_color || "#000"}`
        : "none",
      borderRadius: border_radius || 0,
      marginTop: margin_top,
      marginBottom: margin_bottom,
      marginLeft: margin_left,
      marginRight: margin_right,
      paddingTop: padding_top,
      paddingBottom: padding_bottom,
      paddingLeft: padding_left,
      paddingRight: padding_right,
      boxSizing: "border-box",
      ...(isTopLevel && {
        position: "absolute",
        top: position.top,
        left: position.left,
      }),
    };

    return (
      <Grid
        key={element_id}
        container={type === "container"}
        direction={direction || "row"}
        justifyContent={justify_content || "flex-start"}
        alignItems={align_items || "flex-start"}
        sx={containerStyles}
      >
        {Array.isArray(children) && children.length > 0 ? (
          children.map((child) => renderElement(child))
        ) : (
          <>
            {type === "text" && (
              <Typography
                sx={{
                  width: "100%",
                  height: "100%",
                  color: props.font_color || "#000",
                  fontFamily: props.font_family,
                  fontSize: parseFloat(props.font_size || "16"),
                  fontWeight: props.font_weight,
                  lineHeight: props.line_height,
                  letterSpacing: props.letter_spacing,
                  textAlign: props.text_align || "left",
                  backgroundColor: is_transparent
                    ? "transparent"
                    : background_color,
                  border: is_border
                    ? `${border || 1}px solid ${border_color || "#000"}`
                    : "none",
                  borderRadius: border_radius || 0,
                  boxSizing: "border-box",
                }}
              >
                {props.text}
              </Typography>
            )}

            {type === "canvas" && (
              <iframe
                id={`canvas-iframe`}
                src={iframeUrl}
                scrolling="no"
                height="100%"
                width="100%"
                frameBorder={0}
              />
            )}

            {type === "image" && (
              <>
                <img
                  src={props.path}
                  alt=""
                  useMap={`#map-${element_id}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: props.object_fit || "cover",
                    borderRadius: border_radius || 0,
                    border: is_border
                      ? `${border || 1}px solid ${border_color || "#000"}`
                      : "none",
                    backgroundColor: is_transparent
                      ? "transparent"
                      : background_color,
                  }}
                />
                <map name={`map-${element_id}`}>
                  {getPolygonMapData(element_id).map(
                    (coords, idx) => (
                      console.log("coords", coords),
                      (
                        <area
                          key={idx}
                          shape="poly"
                          coords={coords.join(",")}
                          href="#"
                          alt={`Hotspot ${idx}`}
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.preventDefault();
                            console.log(
                              "Clicked polygon",
                              idx,
                              "for image",
                              element_id
                            );
                          }}
                        />
                      )
                    )
                  )}
                </map>
              </>
            )}
          </>
        )}
      </Grid>
    );
  };

  return (
    <Box style={{}}>
      {/* {pageLayout.map((element) => (
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
      ))} */}
      {pageLayout.map(renderElement)}
    </Box>
  );
};

export default StorefrontLayout;

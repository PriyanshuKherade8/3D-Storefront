import React, { useState, useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useGetProductListData, useSetProductChangeCall } from "../services";

const getScreenTypeValue = (screenWidth, screenHeight) => {
  const aspectRatio = screenWidth / screenHeight;
  return aspectRatio >= 1 ? "01" : "02";
};

const StorefrontLayout = () => {
  const resizeObserverRef = useRef(null);
  const imageRef = useRef(null);
  const [scaledCoordsMap, setScaledCoordsMap] = useState({});
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const { data: storeData } = useGetProductListData();
  const { mutate: changeViewCall } = useSetProductChangeCall();

  const storefrontData = storeData?.data;
  const sessionID = storefrontData?.sessionID;
  const itemsData = storefrontData?.storefront?.items;

  const convertedItemsData = itemsData?.map((item) => {
    const convertedMaps = item?.map.map((screen) => {
      const coordsString = screen.values.join(", ");
      return {
        screen_type_id: screen.screen_type_id,
        coords: coordsString,
      };
    });

    return {
      ...item,
      map: convertedMaps,
    };
  });

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

  const scalePolygonCoords = (
    originalCoords,
    naturalWidth,
    naturalHeight,
    currentWidth,
    currentHeight
  ) => {
    const scaled = [];
    for (let i = 0; i < originalCoords.length; i += 2) {
      const x = (originalCoords[i] / naturalWidth) * currentWidth;
      const y = (originalCoords[i + 1] / naturalHeight) * currentHeight;
      scaled.push(Math.round(x));
      scaled.push(Math.round(y));
    }
    return scaled;
  };

  const updateScaledCoords = () => {
    if (!imageRef.current) return;

    const currentWidth = imageRef.current.clientWidth;
    const currentHeight = imageRef.current.clientHeight;
    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;

    if (!naturalWidth || !naturalHeight) return;

    setImageSize({ width: currentWidth, height: currentHeight });

    const newCoordsMap = {};
    itemsData?.forEach((item) => {
      const mapEntry = item.map.find((m) => m.screen_type_id === screenType);
      if (!mapEntry || !Array.isArray(mapEntry.values)) return;

      const scaled = scalePolygonCoords(
        mapEntry.values,
        naturalWidth,
        naturalHeight,
        currentWidth,
        currentHeight
      );
      newCoordsMap[item.item_id] = scaled.join(",");
    });

    setScaledCoordsMap(newCoordsMap);
  };

  useEffect(() => {
    if (imageLoaded) updateScaledCoords();
    window.addEventListener("resize", updateScaledCoords);
    return () => window.removeEventListener("resize", updateScaledCoords);
  }, [itemsData, screenType, imageLoaded]);

  useEffect(() => {
    if (!imageRef.current) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      const img = imageRef.current;
      if (!img || !img.naturalWidth || !img.naturalHeight) return;

      const currentWidth = img.clientWidth;
      const currentHeight = img.clientHeight;

      setImageSize({ width: currentWidth, height: currentHeight });

      const newCoordsMap = {};
      itemsData?.forEach((item) => {
        const mapEntry = item.map.find((m) => m.screen_type_id === screenType);
        if (!mapEntry || !Array.isArray(mapEntry.values)) return;

        const scaled = scalePolygonCoords(
          mapEntry.values,
          img.naturalWidth,
          img.naturalHeight,
          currentWidth,
          currentHeight
        );

        newCoordsMap[item.item_id] = scaled.join(",");
      });

      setScaledCoordsMap(newCoordsMap);
    });

    resizeObserverRef.current.observe(imageRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [itemsData, screenType]);

  const getValueByScreenType = (dataArray, screenTypeId) =>
    Array.isArray(dataArray)
      ? dataArray.find((item) => item.screen_type_id === screenTypeId) || null
      : null;

  const getPropValue = (dataArray, screenTypeId, fallback = null) => {
    const match = getValueByScreenType(dataArray, screenTypeId);
    return match?.value ?? match?.path ?? fallback;
  };

  const extractElementProps = (element, screenTypeId) => {
    const props = {};

    for (const key in element) {
      const val = element[key];

      if (Array.isArray(val) && val.length > 0 && val[0]?.screen_type_id) {
        const resolved = getPropValue(val, screenTypeId, null);
        if (resolved !== null) props[key] = resolved;
      } else if (
        typeof val === "object" &&
        val !== null &&
        !Array.isArray(val) &&
        Object.values(val).some((v) => v?.screen_type_id)
      ) {
        const resolved = getPropValue(Object.values(val), screenTypeId, null);
        if (resolved !== null) props[key] = resolved;
      } else if (
        typeof val === "string" ||
        typeof val === "number" ||
        typeof val === "boolean"
      ) {
        props[key] = val;
      }
    }

    return props;
  };

  const computeElementLayout = (
    element,
    screenTypeId,
    parentWidth,
    parentHeight,
    elementIndex = 0,
    isChild = false
  ) => {
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

    if (!isChild) {
      const positionObj = getValueByScreenType(element.position, screenTypeId);
      const top = parseFloat(positionObj?.top || 0) * parentHeight;
      const left = parseFloat(positionObj?.left || 0) * parentWidth;
      layout.position = { top, left };
    }

    if (Array.isArray(element.children) && element.children.length > 0) {
      layout.children = element.children.map((child, index) =>
        computeElementLayout(child, screenTypeId, width, height, index, true)
      );
    }

    return layout;
  };

  const generatePageLayout = (
    storefrontData,
    screenTypeId,
    innerWidth,
    innerHeight
  ) => {
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
  };

  const pageLayout = generatePageLayout(
    storefrontData,
    screenType,
    window.innerWidth,
    window.innerHeight
  );

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
      // ...(isTopLevel && {
      //   position: "absolute",
      //   top: position.top,
      //   left: position.left,
      // }),
      position: isTopLevel ? "absolute" : "relative",
      ...(isTopLevel && {
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
                  ref={imageRef}
                  src={props.path}
                  alt="Test Image"
                  useMap="#map-test"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    // objectFit: props.object_fit || "cover",
                    objectFit: "contain",
                    borderRadius: border_radius || 0,
                    border: is_border
                      ? `${border || 1}px solid ${border_color || "#000"}`
                      : "none",
                    backgroundColor: is_transparent
                      ? "transparent"
                      : background_color,
                  }}
                  onLoad={() => setImageLoaded(true)}
                />

                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: `${imageSize.width}px`,
                    height: `${imageSize.height}px`,
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  <svg
                    width={imageSize.width}
                    height={imageSize.height}
                    viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ position: "absolute", top: 0, left: 0 }}
                  >
                    {convertedItemsData?.map((item) => {
                      const coords = scaledCoordsMap[item.item_id];
                      if (!coords) return null;

                      const coordsArray = coords.split(",").map(Number);
                      const points = [];
                      for (let i = 0; i < coordsArray.length; i += 2) {
                        points.push(`${coordsArray[i]},${coordsArray[i + 1]}`);
                      }

                      return (
                        <polygon
                          key={item.item_id}
                          points={points.join(" ")}
                          fill="red"
                          fillOpacity="0.2"
                          stroke={
                            item.item_id === selectedItemId ? "#00f" : "#f00"
                          }
                          strokeWidth={2}
                          style={{
                            filter:
                              item.item_id === selectedItemId
                                ? "drop-shadow(0 0 8px rgba(0, 0, 255, 0.8))"
                                : "none",
                          }}
                        />
                      );
                    })}
                  </svg>
                </Box>

                <map name="map-test">
                  {convertedItemsData?.map((item) => {
                    const coords = scaledCoordsMap[item.item_id];
                    if (!coords) return null;
                    return (
                      <area
                        key={item.item_id}
                        shape="poly"
                        coords={coords}
                        href="#"
                        alt="Test Hotspot"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedItemId(item.item_id);

                          const payload = {
                            session_id: sessionID,
                            message: {
                              type: "change_item",
                              message: { item_id: item.item_id },
                            },
                          };

                          changeViewCall(payload);
                        }}
                      />
                    );
                  })}
                </map>
              </>
            )}
          </>
        )}
      </Grid>
    );
  };

  return <Box>{pageLayout.map(renderElement)}</Box>;
};

export default StorefrontLayout;

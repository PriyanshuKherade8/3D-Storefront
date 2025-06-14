import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import {
  useGetProductListData,
  useSetActionCall,
  useSetProductChangeCall,
} from "../services";
import { useLocation, useParams } from "react-router-dom";
import useSocket from "../hooks/useSocketMessage";
import io from "socket.io-client";
import Loading from "../components/Loading";

const getScreenTypeValue = (screenWidth, screenHeight, screenTypeDetails) => {
  if (
    !screenTypeDetails ||
    !Array.isArray(screenTypeDetails) ||
    screenTypeDetails.length === 0
  ) {
    // console.warn("screenTypeDetails is invalid or empty. Returning null.");
    return null;
  }

  const aspectRatio = screenWidth / screenHeight;
  // console.log("Current Screen Dimensions:", screenWidth, "x", screenHeight);
  // console.log("Calculated Aspect Ratio:", aspectRatio);

  const matchingScreenTypes = screenTypeDetails.filter((screenType) => {
    const minWidth = parseFloat(screenType.minimum_width) || 0;
    const aspectRatioLowerLimit =
      parseFloat(screenType.aspect_ratio_lower_limit) || 0;

    const matchesWidth = screenWidth >= minWidth;
    const matchesAspectRatio = aspectRatio >= aspectRatioLowerLimit;

    return matchesWidth && matchesAspectRatio;
  });

  if (matchingScreenTypes.length > 0) {
    const sorted = matchingScreenTypes.sort(
      (a, b) => parseFloat(b.minimum_width) - parseFloat(a.minimum_width)
    );
    // console.log(
    //   "Matching screen types found (sorted by min_width):",
    //   sorted.map((s) => s.screen_type_name)
    // );
    return sorted[0].screen_type_id;
  }

  const defaultScreenType = screenTypeDetails.find((type) => type.is_default);
  // console.log(
  //   "No specific match found. Falling back to default:",
  //   defaultScreenType?.screen_type_name || "None"
  // );
  return defaultScreenType?.screen_type_id || null;
};

const StorefrontLayout = () => {
  const { id } = useParams();
  const resizeObserverRef = useRef(null);
  const imageRef = useRef(null);

  const screenRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [scaledCoordsMap, setScaledCoordsMap] = useState({});
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  console.log("selectedItemId", selectedItemId);

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const [hoveredItemId, setHoveredItemId] = useState(null);

  const location = useLocation();
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const [isIframeDocumentLoaded, setIsIframeDocumentLoaded] = useState(false);
  const URL = process.env.REACT_APP_SOCKET_URL;
  const socket = io(URL, { autoConnect: false });

  const { currProductKey, isLoadingScreen } = useSocket(socket);

  const iframeRef = useRef(null);

  const isLoadingCanvas = isLoadingScreen;

  const handleIframeLoad = () => {
    setIsIframeDocumentLoaded(true);
  };

  const { data: storeData } = useGetProductListData(id);
  const { mutate: changeViewCall } = useSetProductChangeCall();
  const { mutate: sendControlCall } = useSetActionCall();
  const { mutate: variantChange } = useSetProductChangeCall();

  const storefrontData = storeData?.data;

  const storefrontId = storefrontData?.storefront?.storefront_id;
  const screenOverlayDetails = storefrontData?.storefront?.screen;
  const screenTypeDetails = storefrontData?.storefront?.screen?.screen_type;
  const defaultScreenType = screenTypeDetails?.find((type) => type.is_default);
  const defaultScreenTypeId = defaultScreenType?.screen_type_id || null;
  const productData = storefrontData?.storefront?.products;
  console.log("get", productData);
  const sessionID = storefrontData?.sessionID;
  const itemsData = storefrontData?.storefront?.items;
  const controlsData = storefrontData?.storefront?.controls;

  const [selectedTabs, setSelectedTabs] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});

  const handleVariantChange = useCallback(
    (productId, propertyId, variantId) => {
      const payload = {
        session_id: sessionID,
        message: {
          type: "change_variant",
          message: {
            product_id: productId,
            property_id: propertyId,
            variant_id: variantId,
          },
        },
      };

      setSelectedVariants((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [propertyId]: variantId,
        },
      }));

      variantChange(payload);
    },
    [sessionID, variantChange]
  );

  useEffect(() => {
    if (!isSocketConnected && sessionID) {
      socket.auth = { sessionId: sessionID };
      socket.connect();
      setIsSocketConnected(true);
    }
  }, [sessionID]);

  useEffect(() => {
    const defaultItem = itemsData?.find((item) => item?.is_default);
    if (defaultItem) {
      setSelectedItemId(defaultItem?.item_id);
    }
  }, [itemsData]);

  const convertedItemsData = itemsData?.map((item) => {
    const convertedMaps = item?.map.map((screen) => {
      return {
        screen_type_id: screen.screen_type_id,
        values: screen.values,
      };
    });

    return {
      ...item,
      map: convertedMaps,
    };
  });

  const [screenType, setScreenType] = useState(() =>
    getScreenTypeValue(window.innerWidth, window.innerHeight, screenTypeDetails)
  );

  const [calculatedPageLayoutDimensions, setCalculatedPageLayoutDimensions] =
    useState({
      width: 0,
      height: 0,
    });

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

    const img = imageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    if (!naturalWidth || !naturalHeight) return;

    const parentContainer = img.parentElement;
    if (!parentContainer) return;

    const containerWidth = parentContainer.clientWidth;
    const containerHeight = parentContainer.clientHeight;

    const naturalAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let imgCalculatedWidth = 0;
    let imgCalculatedHeight = 0;

    if (containerAspectRatio > naturalAspectRatio) {
      imgCalculatedHeight = containerHeight;
      imgCalculatedWidth = containerHeight * naturalAspectRatio;
    } else {
      imgCalculatedWidth = containerWidth;
      imgCalculatedHeight = containerWidth / naturalAspectRatio;
    }

    setImageSize({ width: imgCalculatedWidth, height: imgCalculatedHeight });

    const newCoordsMap = {};
    itemsData?.forEach((item) => {
      let mapEntry = item.map.find((m) => m.screen_type_id === screenType);

      if (!mapEntry && defaultScreenTypeId) {
        mapEntry = item.map.find(
          (m) => m.screen_type_id === defaultScreenTypeId
        );
      }

      if (!mapEntry || !Array.isArray(mapEntry.values)) return;

      const scaled = scalePolygonCoords(
        mapEntry.values,
        naturalWidth,
        naturalHeight,
        imgCalculatedWidth,
        imgCalculatedHeight
      );
      newCoordsMap[item.item_id] = scaled.join(",");
    });

    setScaledCoordsMap(newCoordsMap);
  };

  useEffect(() => {
    const handleResize = () => {
      const currentWindowWidth = window.innerWidth;
      const currentWindowHeight = window.innerHeight;

      screenRef.current = {
        width: currentWindowWidth,
        height: currentWindowHeight,
      };

      const newScreenType = getScreenTypeValue(
        currentWindowWidth,
        currentWindowHeight,
        screenTypeDetails
      );
      setScreenType(newScreenType);

      const currentScreenTypeConfig = screenTypeDetails?.find(
        (type) => type.screen_type_id === newScreenType
      );

      const storefrontAspectRatio =
        parseFloat(currentScreenTypeConfig?.storefront_aspect_ratio) || 1;

      let newCalculatedWidth = 0;
      let newCalculatedHeight = 0;

      const windowAspectRatio = currentWindowWidth / currentWindowHeight;

      if (windowAspectRatio > storefrontAspectRatio) {
        newCalculatedHeight = currentWindowHeight;
        newCalculatedWidth = currentWindowHeight * storefrontAspectRatio;
      } else {
        newCalculatedWidth = currentWindowWidth;
        newCalculatedHeight = currentWindowWidth / storefrontAspectRatio;
      }

      setCalculatedPageLayoutDimensions({
        width: newCalculatedWidth,
        height: newCalculatedHeight,
      });

      if (imageLoaded) {
        updateScaledCoords();
      }
    };

    window.addEventListener("resize", handleResize);

    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [screenTypeDetails, imageLoaded]);

  useEffect(() => {
    if (!imageRef.current || !imageRef.current.parentElement) return;

    resizeObserverRef.current?.disconnect();

    resizeObserverRef.current = new ResizeObserver(() => {
      updateScaledCoords();
    });

    resizeObserverRef.current.observe(imageRef.current.parentElement);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [itemsData, screenType, imageLoaded, calculatedPageLayoutDimensions]);

  const getValueByScreenType = (
    dataArray,
    screenTypeId,
    defaultScreenTypeId = null
  ) => {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return null;
    }

    let match = dataArray.find((item) => item.screen_type_id === screenTypeId);

    if (!match && defaultScreenTypeId) {
      match = dataArray.find(
        (item) => item.screen_type_id === defaultScreenTypeId
      );
    }

    return match || null;
  };

  const getPropValue = (
    dataArray,
    screenTypeId,
    defaultScreenTypeId,
    fallback = null
  ) => {
    const match = getValueByScreenType(
      dataArray,
      screenTypeId,
      defaultScreenTypeId
    );
    return match?.value ?? match?.path ?? fallback;
  };

  const extractElementProps = (element, screenTypeId, defaultScreenTypeId) => {
    const props = {};

    for (const key in element) {
      const val = element[key];

      if (Array.isArray(val) && val.length > 0 && val[0]?.screen_type_id) {
        const resolved = getPropValue(
          val,
          screenTypeId,
          defaultScreenTypeId,
          null
        );
        if (resolved !== null) props[key] = resolved;
      } else if (
        typeof val === "object" &&
        val !== null &&
        !Array.isArray(val) &&
        Object.values(val).some((v) => v?.screen_type_id)
      ) {
        const formattedVal = Object.entries(val).map(([id, data]) => ({
          screen_type_id: id,
          value: data.value !== undefined ? data.value : data.path,
        }));
        const resolved = getPropValue(
          formattedVal,
          screenTypeId,
          defaultScreenTypeId,
          null
        );
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
    defaultScreenTypeId,
    parentWidth,
    parentHeight,
    elementIndex = 0,
    isChild = false
  ) => {
    const sizeObj = getValueByScreenType(
      element.size,
      screenTypeId,
      defaultScreenTypeId
    );

    const width = (parseFloat(sizeObj?.x) || 0) * parentWidth;
    const height = (parseFloat(sizeObj?.y) || 0) * parentHeight;

    const layout = {
      element_id: element.element_id,
      type: element.type,
      size: { width, height },
      element_index: elementIndex,
      props: extractElementProps(element, screenTypeId, defaultScreenTypeId),
    };

    if (!isChild) {
      const positionObj = getValueByScreenType(
        element.position,
        screenTypeId,
        defaultScreenTypeId
      );

      const top = (parseFloat(positionObj?.top) || 0) * parentHeight;
      const left = (parseFloat(positionObj?.left) || 0) * parentWidth;
      layout.position = { top, left };
    }

    if (Array.isArray(element.children) && element.children.length > 0) {
      layout.children = element.children.map((child, index) =>
        computeElementLayout(
          child,
          screenTypeId,
          defaultScreenTypeId,
          width,
          height,
          index,
          true
        )
      );
    }

    return layout;
  };

  const generatePageLayout = (
    storefrontData,
    screenTypeId,
    defaultScreenTypeId,
    innerWidth,
    innerHeight
  ) => {
    const elements = storefrontData?.storefront?.elements || [];
    return elements.map((element, index) =>
      computeElementLayout(
        element,
        screenTypeId,
        defaultScreenTypeId,
        innerWidth,
        innerHeight,
        index
      )
    );
  };

  const pageLayout = React.useMemo(() => {
    if (
      !screenType ||
      calculatedPageLayoutDimensions.width === 0 ||
      calculatedPageLayoutDimensions.height === 0
    ) {
      return null;
    }
    const { width, height } = calculatedPageLayoutDimensions;
    return generatePageLayout(
      storefrontData,
      screenType,
      defaultScreenTypeId,
      width,
      height
    );
  }, [
    storefrontData,
    screenType,
    defaultScreenTypeId,
    calculatedPageLayoutDimensions,
  ]);

  function updateTextElements(itemsData, selectedItemId, screenType) {
    const selectedItem = itemsData?.find(
      (item) => item?.item_id === selectedItemId
    );

    if (!selectedItem) return [];

    return selectedItem.element_display.map((element) => {
      if (element.type === "text") {
        const matchedText = element.text.find(
          (t) => t.screen_type_id === screenType
        );
        const displayText = matchedText?.text || "";

        return {
          ...element,
          text: displayText,
        };
      }
      return element;
    });
  }

  const updatedElements = updateTextElements(
    itemsData,
    selectedItemId,
    screenType
  );

  const fileType = screenType === "01" ? "L" : "S";

  const getControlIconPath = (icons, fileType) => {
    const icon = icons.find((icon) => icon.file_type === fileType);
    return icon?.path || "";
  };

  const [controlStates, setControlStates] = useState(() =>
    controlsData?.reduce((acc, control) => {
      acc[control.control_id] = control.default_value === "true";
      return acc;
    }, {})
  );

  const handleControlClick = (control) => {
    setControlStates((prevStates) => {
      const newValue = !prevStates?.[control?.control_id];

      const payload = {
        session_id: sessionID,
        message: {
          type: "control",
          message: {
            control_id: control.control_id,
            value: newValue,
          },
        },
      };

      sendControlCall(payload);
      return { ...prevStates, [control.control_id]: newValue };
    });
  };

  const getSvgStyle = (state, overlayDetails) => {
    const config =
      state === "hover"
        ? overlayDetails?.hover_state
        : overlayDetails?.selected_state;

    const styles = {};

    if (config?.[`is_${state}`]) {
      if (config.is_stroke) {
        styles.stroke = config.stroke_color || "transparent";
        styles.strokeWidth = parseFloat(config.stroke_width ?? 0);
        styles.strokeOpacity = parseFloat(config.stroke_opacity ?? 1);
      }

      if (config.is_fill) {
        styles.fill = config.fill_color
          ? `#${config.fill_color.replace("#", "")}`
          : "transparent";
        styles.fillOpacity = parseFloat(config.fill_opacity ?? 1);
      }
    }

    return styles;
  };

  const hoverStyle = getSvgStyle("hover", screenOverlayDetails);
  const selectedStyle = getSvgStyle("selected", screenOverlayDetails);

  const iframeUrl =
    sessionID && storefrontId
      ? `${process.env.REACT_APP_CANVAS_URL}/?storefront=${storefrontId}&session=${sessionID}&page_height=100&page_width=100`
      : "";

  console.log("iframeUrl", iframeUrl);
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

    let dynamicText = props.text;

    const matchedElement = updatedElements?.find(
      (e) => e.element_id === element?.props?.element_id
    );

    if (matchedElement && matchedElement.text) {
      dynamicText = matchedElement.text;
    }

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
      text_align,
    } = props;

    const isTopLevel = position && typeof position === "object";

    const containerStyles = {
      ...(size?.width && { width: size.width }),
      ...(size?.height && { height: size.height }),
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
      textAlign: text_align,
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
                {dynamicText}
              </Typography>
            )}

            {type === "control" && (
              <Box
                style={{
                  display: "flex",
                  flexDirection: direction || "row",
                }}
              >
                {controlsData?.map((control) => {
                  const iconPath = getControlIconPath(
                    control.control_icons,
                    fileType
                  );

                  return (
                    <img
                      key={control.control_id}
                      src={iconPath}
                      alt={control.control_name}
                      title={control.control_name}
                      style={{
                        margin: "3px",
                        cursor: "pointer",
                      }}
                      onClick={() => handleControlClick(control)}
                    />
                  );
                })}
              </Box>
            )}

            {type === "canvas" && (
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                }}
              >
                <iframe
                  id="canvas-iframe"
                  src={iframeUrl}
                  scrolling="no"
                  height="100%"
                  width="100%"
                  frameBorder={0}
                  title="Storefront Canvas"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    visibility: isLoadingCanvas ? "visible" : "hidden",
                    zIndex: 1,
                  }}
                />

                {!isLoadingCanvas && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      zIndex: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Loading
                      text="Loading..."
                      waveSpeed={0.4}
                      waveHeight={1}
                      fontSize={32}
                      color="#192b61"
                      enableFlicker={true}
                      flickerIntensity={3}
                      flickerSpeed={3}
                      isTransparent={true}
                      backgroundColor={"#D3D3D3"}
                    />
                  </Box>
                )}
              </Box>
            )}

            {type === "config" && selectedItemId && (
              <Box sx={{ width: "100%" }}>
                {productData
                  .filter((product) => product.product_key === selectedItemId)
                  .map((product) => {
                    const { product_key, product_name, property } = product;
                    const localSelectedTab = selectedTabs[product_key] || 0;

                    return (
                      <Box key={product_key} sx={{ mb: 0 }}>
                        <Typography
                          variant="subtitle"
                          sx={{ fontWeight: 600, color: "#192b61" }}
                        >
                          {product_name}
                        </Typography>

                        <Tabs
                          value={localSelectedTab}
                          onChange={(e, newValue) =>
                            setSelectedTabs((prev) => ({
                              ...prev,
                              [product_key]: newValue,
                            }))
                          }
                          variant="scrollable"
                          scrollButtons="auto"
                          aria-label={`config-tabs-${product_key}`}
                          sx={{
                            borderBottom: "1px solid #e0e0e0",
                            "& .MuiTab-root": {
                              textTransform: "none",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "#555",
                            },
                            "& .Mui-selected": {
                              color: "#192b61",
                              fontWeight: 600,
                            },
                          }}
                        >
                          {property.map((prop) => (
                            <Tab
                              key={prop.property_id}
                              label={prop.display_name}
                            />
                          ))}
                        </Tabs>

                        <Box
                          sx={{
                            display: "flex",
                            overflowX: "auto",
                            gap: 2,
                            py: 1,
                          }}
                        >
                          {property[localSelectedTab]?.variants.map(
                            (variant) => {
                              const icon = variant.variant_icons?.find(
                                (icon) => icon.file_type === "L"
                              )?.path;

                              const isSelected =
                                selectedVariants[product.product_id]?.[
                                  property[localSelectedTab].property_id
                                ] === variant.variant_id;

                              return (
                                <Box
                                  key={variant.variant_id}
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    width: 80,
                                    minWidth: 80,
                                    borderRadius: 2,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease-in-out",
                                  }}
                                  title={variant.display_name}
                                  onClick={() =>
                                    handleVariantChange(
                                      product.product_id,
                                      property[localSelectedTab].property_id,
                                      variant.variant_id
                                    )
                                  }
                                >
                                  <Box
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: "50%",
                                      overflow: "hidden",
                                      border: "2px solid #ccc",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: "#fff",
                                      // padding: "5px",
                                      mb: 1,
                                      border: isSelected
                                        ? "2px solid #192b61"
                                        : "2px solid transparent",
                                      backgroundColor: isSelected
                                        ? "#f0f4ff"
                                        : "transparent",
                                    }}
                                  >
                                    <img
                                      src={icon}
                                      alt={variant.display_name}
                                      style={{
                                        width: "80%",
                                        height: "80%",
                                        objectFit: "cover",
                                        borderRadius: "50%",
                                      }}
                                    />
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      textAlign: "center",
                                      fontSize: "12px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {variant.display_name}
                                  </Typography>
                                </Box>
                              );
                            }
                          )}
                        </Box>
                      </Box>
                    );
                  })}
              </Box>
            )}

            {type === "image" && (
              <img
                src={props.path}
                alt="Display"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  borderRadius: border_radius || 0,
                  border: is_border
                    ? `${border || 1}px solid ${border_color || "#000"}`
                    : "none",
                  backgroundColor: is_transparent
                    ? "transparent"
                    : background_color,
                  ...(props.object_fit && { objectFit: props.object_fit }),
                }}
              />
            )}

            {type === "imagemap" && (
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  borderRadius: border_radius || 0,
                  border: is_border
                    ? `${border || 1}px solid ${border_color || "#000"}`
                    : "none",
                  backgroundColor: is_transparent
                    ? "transparent"
                    : background_color,
                }}
              >
                <img
                  ref={imageRef}
                  src={props.path}
                  alt="ImageMap"
                  useMap="#map-test"
                  style={{
                    width: imageSize.width,
                    height: imageSize.height,
                    display: "block",
                  }}
                  onLoad={() => {
                    setImageLoaded(true);
                    updateScaledCoords();
                  }}
                />

                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
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

                      const isHovered = hoveredItemId === item.item_id;
                      const isSelected = item.item_id === selectedItemId;

                      return (
                        <polygon
                          key={item.item_id}
                          points={points.join(" ")}
                          onMouseEnter={() => setHoveredItemId(item.item_id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          style={{
                            fill: isHovered
                              ? hoverStyle.fill
                              : isSelected
                              ? selectedStyle.fill
                              : "rgba(0,0,0,0)",
                            fillOpacity: isHovered
                              ? hoverStyle.fillOpacity
                              : isSelected
                              ? selectedStyle.fillOpacity
                              : 0,
                            stroke: isSelected
                              ? selectedStyle.stroke
                              : isHovered
                              ? hoverStyle.stroke
                              : "transparent",
                            strokeWidth: isSelected
                              ? selectedStyle.strokeWidth
                              : isHovered
                              ? hoverStyle.strokeWidth
                              : 0,
                            pointerEvents: "auto",
                            cursor: "pointer",
                          }}
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
                        alt={`Hotspot for ${item.item_name || item.item_id}`}
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
              </Box>
            )}
          </>
        )}
      </Grid>
    );
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: {
          xs: "block",
          sm: "flex",
        },
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        sx={{
          width: calculatedPageLayoutDimensions.width,
          height: calculatedPageLayoutDimensions.height,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {pageLayout?.map(renderElement)}
      </Box>
    </Box>
  );
};

export default StorefrontLayout;

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Divider,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
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

  const [interactionStates, setInteractionStates] = useState({});

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

  const { mutate: sendRotateCall } = useSetActionCall();
  const { mutate: variantChange } = useSetProductChangeCall();
  const { mutate: interactionCall } = useSetActionCall();

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
  const [selectedIds, setSelectedIds] = useState({});
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

  const handleToggle = (control) => {
    const isBoolean = control.control_data_type === "boolean";
    const currentValue = controlStates?.[control.control_id] ?? false;
    const newValue = isBoolean ? !currentValue : true;

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

    sendRotateCall(payload);

    if (isBoolean) {
      setControlStates((prev) => ({
        ...prev,
        [control.control_id]: newValue,
      }));
    }
  };

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

  useEffect(() => {
    if (controlsData?.length) {
      const initialStates = {};
      controlsData?.forEach((control) => {
        if (control.control_data_type === "boolean") {
          initialStates[control.control_id] = control.default_value === true;
        }
      });
      setControlStates(initialStates);
    }
  }, [controlsData]);

  useEffect(() => {
    if (!selectedItemId || !productData?.length) return;

    const selectedProduct = productData.find(
      (product) => product.product_key === selectedItemId
    );

    if (!selectedProduct) return;

    const defaultVariants = {};

    selectedProduct?.property?.forEach((prop) => {
      const defaultVariant = prop.variants.find(
        (variant) => variant.is_default
      );
      if (defaultVariant) {
        if (!defaultVariants[selectedProduct.product_key]) {
          defaultVariants[selectedProduct.product_key] = {};
        }

        defaultVariants[selectedProduct.product_key][prop.property_id] =
          defaultVariant.variant_id ?? defaultVariant.varinat_id;
      }
    });

    setSelectedVariants((prev) => ({
      ...prev,
      ...defaultVariants,
    }));
  }, [selectedItemId, productData]);

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

  useEffect(() => {
    const defaults = {};
    itemsData?.forEach((item) => {
      item.interactions?.forEach((interaction) => {
        if (interaction.is_default === "true") {
          defaults[interaction.interaction_id] = true;
        }
      });
    });
    setSelectedIds(defaults);
  }, [itemsData]);

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
      selected_color,
      selected_background_color,
      is_selected_color,
      is_selected_background_color,
      is_shadow,
      box_shadow,
      blur,
      is_blur,
      is_selected_border_color,
      selected_border_color,
      interaction_direction,
      config_direction,
    } = props;

    const isVisible = element?.props?.is_visible !== false;

    if (!isVisible) return null;

    const isTopLevel = position && typeof position === "object";

    const containerStyles = {
      ...(size?.width && { width: size.width }),
      ...(size?.height && { height: size.height }),
      zIndex: element_index,
      backgroundColor: is_transparent
        ? "transparent"
        : background_color || "transparent",
      background: is_transparent
        ? "transparent"
        : background_color || "transparent",
      border: is_border
        ? `${border || 1}px solid ${border_color || "#000"}`
        : "none",
      backdropFilter: is_blur ? `blur${blur}px` : "blur(0)px",
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
      boxShadow: is_shadow ? box_shadow : "none",
      textAlign: text_align,
      position: isTopLevel ? "absolute" : "relative",
      ...(isTopLevel && {
        top: position.top,
        left: position.left,
      }),
    };

    const handleClick = () => {
      let path = element?.props?.on_click;

      if (path) {
        if (!/^https?:\/\//i.test(path)) {
          path = `https://${path}`;
        }
        window.open(path, "_blank");
      }
    };

    const toggleBorder = (interactionId, interaction, item) => {
      const isSelected = !!selectedIds[interactionId];
      const updated = { ...selectedIds };

      if (isSelected) {
        delete updated[interactionId];
      } else {
        updated[interactionId] = true;
      }

      interactionCall({
        session_id: sessionID,
        message: {
          type: "run_interaction",
          message: {
            item_id: item.item_id,
            product_key: item.product_key,
            interaction_id: interactionId,
          },
        },
      });

      setSelectedIds(updated);
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
                sx={{
                  display: "flex",
                  flexDirection: direction || "row",
                  width: "100%",
                  height: "100%",
                  gap: "6px",
                }}
              >
                {controlsData?.map((control) => {
                  const iconPath = getControlIconPath(
                    control.control_icons,
                    fileType
                  );
                  const isBoolean = control.control_data_type === "boolean";
                  const isSelected =
                    isBoolean && controlStates?.[control.control_id];

                  const selectedBackgroundColor = is_selected_background_color
                    ? selected_background_color
                    : "white";

                  return (
                    <Box
                      key={control.control_id}
                      sx={{
                        backgroundColor: isSelected
                          ? selectedBackgroundColor
                          : "transparent",
                        borderRadius: "10px",
                      }}
                    >
                      <Tooltip title={control.control_name}>
                        <IconButton onClick={() => handleToggle(control)}>
                          <img src={iconPath} alt={control.control_name} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Box>
            )}

            {type === "interaction" && (
              <div
                style={{
                  display: "flex",

                  flexDirection: direction || "row",
                }}
              >
                <Box
                  style={{
                    display: "flex",
                    gap: "10px",
                    height: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {itemsData?.map((item) =>
                    item.interactions?.map((interaction) => {
                      const icon = interaction.interaction_icons?.[0];
                      if (!icon) return null;

                      const currentState =
                        interactionStates[interaction.interaction_id] != null
                          ? interactionStates[interaction.interaction_id]
                          : interaction.default_state;

                      const label = currentState
                        ? interaction.true_name
                        : interaction.false_name;

                      const isSelected = currentState;

                      return (
                        <div
                          key={interaction.interaction_id}
                          onClick={() => {
                            setInteractionStates((prev) => ({
                              ...prev,
                              [interaction.interaction_id]: !currentState,
                            }));
                            toggleBorder(
                              interaction.interaction_id,
                              interaction,
                              item
                            );
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            cursor: "pointer",
                          }}
                        >
                          <Box
                            sx={{
                              border: isSelected
                                ? "2px solid #192b61"
                                : "2px solid transparent",
                              borderRadius: "8px",
                              padding: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "50px",
                              height: "50px",
                              boxSizing: "border-box",
                            }}
                          >
                            <Tooltip title={label}>
                              <img
                                src={icon.path}
                                alt={label}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  borderRadius: "4px",
                                }}
                              />
                            </Tooltip>
                          </Box>

                          <Typography
                            variant="caption"
                            sx={{
                              textAlign: "center",
                              fontSize: "13px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              width: "100%",
                              display: "block",
                              fontFamily: "Outfit",
                            }}
                          >
                            {label}
                          </Typography>
                        </div>
                      );
                    })
                  )}
                </Box>
              </div>
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
              <Box sx={{ width: "100%", height: "100%" }}>
                {productData
                  .filter((product) => product.product_key === selectedItemId)
                  .map((product) => {
                    const {
                      product_key,
                      product_name,
                      property,
                      display_name,
                    } = product;
                    const localSelectedTab = selectedTabs[product_key] || 0;

                    return (
                      <Box key={product_key}>
                        {display_name && (
                          <Box style={{ marginBottom: "10px" }}>
                            <Typography
                              variant="subtitle"
                              sx={{ fontWeight: 600, color: "#192b61" }}
                            >
                              {display_name}
                            </Typography>
                          </Box>
                        )}

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
                            minHeight: "auto",
                            padding: "0px",
                            borderBottom: "1px solid #e0e0e0",
                            "& .MuiTabs-flexContainer": {
                              gap: 1,
                            },
                            "& .MuiTab-root": {
                              textTransform: "none",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "#192b61",
                              fontFamily: "inherit",
                              minHeight: "auto",
                              padding: "0px",
                            },
                            "& .MuiTab-root.Mui-selected": {
                              color: "#192b61",
                              fontWeight: 600,
                              marginBottom: "5px",
                            },
                            "& .MuiTabs-indicator": {
                              backgroundColor: "#192b61",
                            },
                          }}
                        >
                          {property.map((prop) => (
                            <Tab
                              key={prop.property_id}
                              label={prop.display_name}
                              disableRipple
                            />
                          ))}
                        </Tabs>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            width: "100%",
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            id={`variant-scroll-${product_key}`}
                            sx={{
                              display: "flex",
                              gap: 3,
                              // py: 0.5,
                              paddingTop: "5px",
                              overflowX: "auto",
                              overflowY: "hidden",
                              width: "100%",
                              // justifyContent: "space-between",
                              scrollBehavior: "smooth",
                              WebkitOverflowScrolling: "touch",
                              scrollbarWidth: "thin",
                              "&::-webkit-scrollbar": {
                                height: "4px",
                              },
                              "&::-webkit-scrollbar-track": {
                                backgroundColor: "transparent",
                              },
                              "&::-webkit-scrollbar-thumb": {
                                backgroundColor: "#aaa",
                                borderRadius: "4px",
                              },
                            }}
                          >
                            {property[localSelectedTab]?.variants.map(
                              (variant) => {
                                const productKey = product.product_key;
                                const propertyId =
                                  property[localSelectedTab].property_id;
                                const variantId =
                                  variant.variant_id ?? variant.varinat_id;

                                const isSelected =
                                  selectedVariants?.[productKey]?.[
                                    propertyId
                                  ] === variantId;

                                const icon = variant.variant_icons?.find(
                                  (icon) => icon.file_type === "L"
                                )?.path;

                                return (
                                  <Box
                                    key={variantId}
                                    sx={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      width: 65,
                                      minWidth: 65,
                                      cursor: "pointer",
                                      transition: "all 0.2s ease-in-out",
                                      flexShrink: 0,
                                    }}
                                    title={variant.display_name}
                                    onClick={() => {
                                      handleVariantChange(
                                        productKey,
                                        propertyId,
                                        variantId
                                      );
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "50%",
                                        overflow: "hidden",
                                        border: isSelected
                                          ? "2px solid #192b61"
                                          : "2px solid transparent",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: isSelected
                                          ? "#f0f4ff"
                                          : "transparent",
                                        padding: "4px",
                                      }}
                                    >
                                      <img
                                        src={icon}
                                        alt={variant.display_name}
                                        style={{
                                          width: "100%",
                                          height: "100%",
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
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        width: "100%",
                                        display: "block",
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

            {type === "button" && (
              <Box
                onClick={handleClick}
                style={{
                  backgroundColor: props?.background_color,
                  borderRadius: props?.border_radius,
                  border: props?.is_border
                    ? `${props?.border}px solid ${props?.border_color}`
                    : "none",
                  color: props?.font_color,
                  fontFamily: props?.font_family,
                  fontSize: props?.font_size,
                  fontStyle: props?.font_style,
                  fontWeight: props?.font_weight,
                  letterSpacing: props?.letter_spacing,
                  lineHeight: props?.line_height,
                  marginTop: `${props?.margin_top}px`,
                  marginBottom: `${props?.margin_bottom}px`,
                  marginLeft: `${props?.margin_left}px`,
                  marginRight: `${props?.margin_right}px`,
                  paddingTop: `${props?.padding_top}px`,
                  paddingBottom: `${props?.padding_bottom}px`,
                  paddingLeft: `${props?.padding_left}px`,
                  paddingRight: `${props?.padding_right}px`,
                  textAlign: props?.text_align,
                  cursor: props?.on_click ? "pointer" : "default",
                }}
              >
                {props?.text}
              </Box>
            )}

            {type === "interactionConfig" && (
              <>
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {productData
                    .filter((product) => product.product_key === selectedItemId)
                    .map((product) => {
                      const {
                        product_key,
                        product_name,
                        property,
                        display_name,
                      } = product;
                      const localSelectedTab = selectedTabs[product_key] || 0;

                      return (
                        <Box key={product_key}>
                          {display_name && (
                            <Box
                            // sx={{ marginBottom: "4px" }}
                            >
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: 550,
                                  color: "#192b61",
                                  fontFamily: "Outfit",
                                  fontSize: "18px",
                                }}
                              >
                                {display_name}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                </Box>
                <Box
                  style={{
                    display: "flex",
                    flexDirection: direction || "row",
                  }}
                >
                  {/* parent */}
                  <Box
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {/* interaction */}
                    <Box
                      style={{
                        display: "flex",
                        gap: "10px",
                        height: "100%",
                        flexDirection: interaction_direction || "row",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {itemsData?.map((item) =>
                        item.interactions?.map((interaction) => {
                          const icon = interaction.interaction_icons?.[0];
                          if (!icon) return null;

                          const currentState =
                            interactionStates[interaction.interaction_id] !=
                            null
                              ? interactionStates[interaction.interaction_id]
                              : interaction.default_state;

                          const label = currentState
                            ? interaction.true_name
                            : interaction.false_name;

                          const isSelected = currentState;

                          return (
                            <div
                              key={interaction.interaction_id}
                              onClick={() => {
                                setInteractionStates((prev) => ({
                                  ...prev,
                                  [interaction.interaction_id]: !currentState,
                                }));
                                toggleBorder(
                                  interaction.interaction_id,
                                  interaction,
                                  item
                                );
                              }}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <Box
                                sx={{
                                  border: isSelected
                                    ? "2px solid #192b61"
                                    : "2px solid transparent",
                                  borderRadius: "8px",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "50px",
                                  height: "50px",
                                  boxSizing: "border-box",
                                }}
                              >
                                <Tooltip title={label}>
                                  <img
                                    src={icon.path}
                                    alt={label}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      borderRadius: "4px",
                                    }}
                                  />
                                </Tooltip>
                              </Box>

                              <Typography
                                variant="caption"
                                sx={{
                                  textAlign: "center",
                                  fontSize: "13px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  width: "100%",
                                  display: "block",
                                  fontFamily: "Outfit",
                                }}
                              >
                                {label}
                              </Typography>
                            </div>
                          );
                        })
                      )}
                    </Box>

                    <Divider
                      orientation={
                        direction === "column" ? "horizontal" : "vertical"
                      }
                      flexItem
                      sx={{
                        margin: direction === "column" ? "8px 0" : "0 16px",
                      }}
                    />

                    {/* config */}
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      {productData
                        .filter(
                          (product) => product.product_key === selectedItemId
                        )
                        .map((product) => {
                          const {
                            product_key,
                            product_name,
                            property,
                            display_name,
                          } = product;
                          const localSelectedTab =
                            selectedTabs[product_key] || 0;

                          return (
                            <Box key={product_key}>
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
                                  minHeight: "auto",
                                  padding: "0px",
                                  borderBottom: "1px solid #e0e0e0",
                                  "& .MuiTabs-flexContainer": {
                                    gap: 1,
                                  },
                                  "& .MuiTab-root": {
                                    textTransform: "none",
                                    fontWeight: 500,
                                    fontSize: "14px",
                                    color: "#192b61",
                                    fontFamily: "Outfit",
                                    minHeight: "auto",
                                    padding: "0px",
                                  },
                                  "& .MuiTab-root.Mui-selected": {
                                    color: "#192b61",
                                    fontWeight: 550,
                                    marginBottom: "5px",
                                  },
                                  "& .MuiTabs-indicator": {
                                    backgroundColor: "#192b61",
                                  },
                                }}
                              >
                                {property.map((prop) => (
                                  <Tab
                                    key={prop.property_id}
                                    label={prop.display_name}
                                    disableRipple
                                  />
                                ))}
                              </Tabs>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  width: "100%",
                                  overflow: "hidden",
                                }}
                              >
                                <Box
                                  id={`variant-scroll-${product_key}`}
                                  sx={{
                                    display: "flex",
                                    gap: 3,

                                    paddingTop: "5px",
                                    overflowX: "auto",
                                    overflowY: "hidden",
                                    width: "100%",

                                    scrollBehavior: "smooth",
                                    WebkitOverflowScrolling: "touch",
                                    scrollbarWidth: "thin",
                                    "&::-webkit-scrollbar": {
                                      height: "4px",
                                    },
                                    "&::-webkit-scrollbar-track": {
                                      backgroundColor: "transparent",
                                    },
                                    "&::-webkit-scrollbar-thumb": {
                                      backgroundColor: "#aaa",
                                      borderRadius: "4px",
                                    },
                                  }}
                                >
                                  {property[localSelectedTab]?.variants.map(
                                    (variant) => {
                                      const productKey = product.product_key;
                                      const propertyId =
                                        property[localSelectedTab].property_id;
                                      const variantId =
                                        variant.variant_id ??
                                        variant.varinat_id;

                                      const isSelected =
                                        selectedVariants?.[productKey]?.[
                                          propertyId
                                        ] === variantId;

                                      const icon = variant.variant_icons?.find(
                                        (icon) => icon.file_type === "L"
                                      )?.path;

                                      return (
                                        <Box
                                          key={variantId}
                                          sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            width: 65,
                                            minWidth: 65,
                                            cursor: "pointer",
                                            transition: "all 0.2s ease-in-out",
                                            flexShrink: 0,
                                          }}
                                          title={variant.display_name}
                                          onClick={() => {
                                            handleVariantChange(
                                              productKey,
                                              propertyId,
                                              variantId
                                            );
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              width: 34,
                                              height: 34,
                                              borderRadius: "50%",
                                              overflow: "hidden",
                                              border: isSelected
                                                ? "2px solid #192b61"
                                                : "2px solid transparent",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              backgroundColor: isSelected
                                                ? "#f0f4ff"
                                                : "transparent",
                                              padding: "4px",
                                            }}
                                          >
                                            <img
                                              src={icon}
                                              alt={variant.display_name}
                                              style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                borderRadius: "50%",
                                              }}
                                            />
                                          </Box>
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              textAlign: "center",
                                              fontSize: "13px",
                                              whiteSpace: "nowrap",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              width: "100%",
                                              display: "block",
                                              fontFamily: "Outfit",
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
                            </Box>
                          );
                        })}
                    </Box>
                  </Box>
                </Box>
              </>
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
        justifyContent: {
          sm: "center",
        },
        alignItems: {
          sm: "center",
        },
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
          margin: {
            xs: "0 auto",
            sm: 0,
          },
        }}
      >
        {pageLayout?.map(renderElement)}
      </Box>
    </Box>
  );
};

export default StorefrontLayout;

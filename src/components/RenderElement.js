import { Box, Grid2, Typography } from "@mui/material";

const renderElement = (element) => {
  const { type, size, props, children = [], element_index } = element;

  const commonStyles = {
    width: size?.width,
    height: size?.height,
    border: props?.is_border
      ? `${props?.border}px solid ${props?.border_color}`
      : "none",
    borderRadius: props?.border_radius || 0,
    backgroundColor: props?.is_transparent
      ? "transparent"
      : props?.background_color,
    paddingLeft: props?.padding_left,
    paddingRight: props?.padding_right,
    paddingTop: props?.padding_top,
    paddingBottom: props?.padding_bottom,
    marginLeft: props?.margin_left,
    marginRight: props?.margin_right,
    marginTop: props?.margin_top,
    marginBottom: props?.margin_bottom,
    zIndex: element_index,
  };

  if (type === "container") {
    return (
      <Grid2
        key={element.element_id}
        container
        direction="row"
        justifyContent={props?.justify_content}
        alignItems={props?.align_items}
        sx={{ ...commonStyles }}
      >
        {children.map((child) => renderElement(child))}
      </Grid2>
    );
  }

  if (type === "image") {
    return (
      <Grid2 key={element.element_id} sx={{ ...commonStyles }}>
        <Box
          component="img"
          src={props?.path}
          alt="storefront-image"
          sx={{
            objectFit: props?.object_fit || "cover",
            width: "100%",
            height: "100%",
            borderRadius: props?.border_radius || 0,
          }}
        />
      </Grid2>
    );
  }

  if (type === "text") {
    return (
      <Grid2 key={element.element_id} sx={{ ...commonStyles }}>
        <Typography
          sx={{
            fontFamily: props?.font_family,
            fontSize: props?.font_size,
            fontWeight: props?.font_weight,
            color: props?.font_color,
            textAlign: props?.text_align,
            lineHeight: props?.line_height,
            letterSpacing: props?.letter_spacing,
          }}
        >
          {props?.text}
        </Typography>
      </Grid2>
    );
  }

  if (type === "canvas") {
    return (
      <Grid2 key={element.element_id} sx={{ ...commonStyles }}>
        <Box sx={{ width: "100%", height: "100%", backgroundColor: "#fff" }} />
      </Grid2>
    );
  }

  return null;
};

export default renderElement;

import { useEffect, useRef, useState } from "react";

const useResponsiveCoords = ({ width, height, areas }) => {
  const imageRef = useRef(null);
  const [coords, setCoords] = useState([]);

  useEffect(() => {
    const updateCoords = () => {
      if (!imageRef.current) return;

      const img = imageRef.current;
      const imgWidth = img.offsetWidth;
      const imgHeight = img.offsetHeight;

      const newCoords = areas.map((area) => {
        const originalCoords = area.coords.split(",").map(Number);
        return originalCoords
          .map((val, index) =>
            index % 2 === 0
              ? (val / width) * imgWidth
              : (val / height) * imgHeight
          )
          .map(Math.round)
          .join(",");
      });

      setCoords(newCoords);
    };

    window.addEventListener("resize", updateCoords);
    setTimeout(updateCoords, 500); // for initial load

    return () => window.removeEventListener("resize", updateCoords);
  }, [areas, width, height]);

  return { imageRef, coords };
};

export default useResponsiveCoords;

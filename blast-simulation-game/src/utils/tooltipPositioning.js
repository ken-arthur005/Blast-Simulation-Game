import { Mouse } from "lucide-react";

/**
  @param {number} mouseX 
  @param {number} mouseY 
  @param {number} tooltipWidth 
  @param {number} tooltipHeight 
 * @returns {{left: number, top: number, right: number, bottom: number}} - Calculated tooltip position
 */
export const calculateTooltipPosition = (
  mouseX,
  mouseY,
  tooltipWidth = 200,
  tooltipHeight = 120
) => {
  const offset = 250; // Close offset for better positioning
  const edgeMargin = 10; // Margin from screen edges

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left, top;

  const isLeftSide = mouseX < viewportWidth / 2;
  const isTopSide = mouseY < viewportHeight / 2;

  if (isLeftSide) {
    left = tooltipWidth + offset - mouseX;
    if (left < edgeMargin) {
      left = edgeMargin;
    }
  } else {
    left = mouseX - tooltipWidth - offset;

    if (left + tooltipWidth > viewportWidth - edgeMargin) {
      left = viewportWidth - tooltipWidth - edgeMargin;
    }
  }

  if (isTopSide) {
    top = mouseY - tooltipHeight - offset;
    if (top < edgeMargin) {
      top = edgeMargin;
    }
  } else {
    top = mouseY - tooltipHeight - offset;
    if (top < edgeMargin) {
      top = mouseY - tooltipHeight / 2;
    }
  }

  //Final boundary checks to ensure tooltip NEVER extends beyond viewport
  left = Math.max(
    edgeMargin,
    Math.min(viewportWidth - tooltipWidth - edgeMargin, left)
  );

  top = Math.max(
    edgeMargin,
    Math.min(viewportHeight - tooltipHeight - edgeMargin, top)
  );

  return { left, top };
};

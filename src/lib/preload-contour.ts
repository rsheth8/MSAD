/** Start downloading the contour shader chunk as soon as the app hydrates. */
export function preloadContourScene() {
  void import("@/components/ContourScene");
}

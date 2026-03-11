import { Box } from "@chakra-ui/react";

export function SceneStage({
  children,
  floorUrl,
  topProps,
  leftProps,
  rightProps,
  bottomProps,
  headerH = "64px",
  topH = { base: "260px", md: "300px", xl: "320px" },
  bottomH = { base: "220px", md: "240px" },
  sideW = { base: "110px", md: "160px", xl: "200px" },
  gap = 0,
}) {
  return (
    <Box
      position="relative"
      overflow="hidden"
      minH={`calc(100dvh - ${headerH})`}
      bgImage={floorUrl ? `url(${floorUrl})` : undefined}
      bgRepeat="repeat"
      bgSize="256px 256px"
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h={topH}
        zIndex={2}
        pointerEvents="none"
      >
        {topProps}
      </Box>

      <Box
        position="absolute"
        top={topH}
        bottom={bottomH}
        left={0}
        w={sideW}
        zIndex={2}
        pointerEvents="none"
      >
        {leftProps}
      </Box>

      <Box
        position="absolute"
        top={topH}
        bottom={bottomH}
        right={0}
        w={sideW}
        zIndex={2}
        pointerEvents="none"
      >
        {rightProps}
      </Box>

      <Box
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        h={bottomH}
        zIndex={2}
        pointerEvents="none"
      >
        {bottomProps}
      </Box>

      <Box
        position="relative"
        zIndex={3}
        minH={`calc(100dvh - ${headerH})`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        pt={topH}
        pb={bottomH}
        px={`calc(${sideW} + ${gap}px)`}
        boxSizing="border-box"
      >
        {children}
      </Box>
    </Box>
  );
}
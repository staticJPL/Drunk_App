import { Box } from "@chakra-ui/react";

export default function MainContainer({ header, children }) {
  return (
    <Box minH="100vh" bg="#1C120C">
      <Box
        maxW="1400px"
        mx="auto"
        minH="100vh"
        boxShadow="0 0 30px rgba(0,0,0,0.6)"
        overflow="hidden"
      >
        {header}
        {children}
      </Box>
    </Box>
  );
}
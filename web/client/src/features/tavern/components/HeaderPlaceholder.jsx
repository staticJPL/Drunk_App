import { Box } from "@chakra-ui/react";
import HeaderTexture from "../../../assets/textures/tavern_walnut_texture.png";

export default function HeaderPlaceholder() {
  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={10}
      borderBottomWidth="1px"
      borderColor="rgba(0,0,0,0.35)"
      px={{ base: 4, md: 6 }}
      py={0}
      h={{ base: "56px", md: "64px" }}
      bgImage={`url(${HeaderTexture})`}
      bgRepeat="repeat"
      bgSize="512px"
      bgPosition="center"
    />
  );
}
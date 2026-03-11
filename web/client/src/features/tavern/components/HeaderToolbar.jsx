import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { IndicatorRow } from "../../../shared/components/IndicatorRow.jsx";
import HeaderTexture from "../../../assets/textures/tavern_walnut_texture.png";
import {
  BreathState,
  getBreathStateLabel,
} from "../protocol/breathSnapshot.js";
import { tavernColors } from "../constants/tavernConstants.js";

export default function HeaderToolbar({ snapshot = null }) {
  const breathStateText = getBreathStateLabel(snapshot?.state);

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={10}
      borderBottomWidth="1px"
      borderColor="rgba(0,0,0,0.35)"
      px={{ base: 3, md: 6 }}
      py={0}
      h={{ base: "56px", md: "64px" }}
      display="flex"
      alignItems="center"
      bgImage={`url(${HeaderTexture})`}
      bgRepeat="repeat"
      bgSize="512px"
      bgPosition="center"
    >
      <Flex w="full" justify="center" align="center">
        <HStack
          spacing={{ base: 2, md: 3 }}
          flexWrap="wrap"
          justify="center"
          align="center"
          maxW="100%"
        >
          <Text
            fontSize={{ base: "md", md: "lg" }}
            lineHeight="1"
            display="flex"
            alignItems="center"
            color={tavernColors.panel}
            opacity={0.94}
            textShadow="0 2px 0 rgba(0,0,0,0.7), 0 0 10px rgba(201,162,39,0.25)"
            whiteSpace="nowrap"
          >
            {breathStateText}
          </Text>

          <Flex
            align="center"
            transform={{ base: "translateY(1px)", md: "translateY(3px)" }}
          >
            <IndicatorRow
              breathState={snapshot?.state ?? BreathState.Idle}
              bac={snapshot?.bac ?? 0}
              count={5}
              size={{ base: "12px", sm: "14px", md: "15px" }}
              offColor={tavernColors.panel}
              ringColor={tavernColors.woodDark}
              mt={0}
            />
          </Flex>
        </HStack>
      </Flex>
    </Box>
  );
}
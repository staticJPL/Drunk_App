import { Box, HStack, Text, Button } from "@chakra-ui/react";
import { IndicatorRow } from "./IndicatorRow.jsx";

const SEAT_TILE_W = "clamp(150px, 16vw, 210px)";

export default function SeatCard({ drinker, onRemove }) {
  return (
    <Box
      w={SEAT_TILE_W}
      maxW={SEAT_TILE_W}
      alignSelf="center"
      bg="rgba(250,241,217,0.9)"
      borderWidth="1px"
      borderColor="rgba(42,23,14,0.25)"
      borderRadius="lg"
      p={3}
      boxShadow="sm"
    >
      <HStack justify="space-between" align="center" mb={2}>
        <Text fontWeight="bold" noOfLines={1}>
          {drinker.name}
        </Text>
        <Button size="xs" variant="outline" onClick={() => onRemove?.(drinker.id)}>
          Remove
        </Button>
      </HStack>

      <Text fontSize="sm" opacity={0.85}>
        BAC: {drinker.bac ?? "--"}
      </Text>

      <IndicatorRow mt={2} level={drinker.level ?? 0} count={5} size="12px" ringColor="#2A170E" />
    </Box>
  );
}
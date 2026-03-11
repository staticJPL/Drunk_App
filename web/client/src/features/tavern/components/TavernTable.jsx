import { Box, Text, AspectRatio, Circle, VStack } from "@chakra-ui/react";

const SEAT_SLOTS = [
  { seatId: "left_1", x: "-15%", y: "12%", rot: "0deg", avatarX: "65%", avatarY: "62%" },
  { seatId: "left_2", x: "-15%", y: "36%", rot: "0deg", avatarX: "65%", avatarY: "62%" },
  { seatId: "left_3", x: "-15%", y: "60%", rot: "0deg", avatarX: "65%", avatarY: "62%" },
  { seatId: "left_4", x: "-15%", y: "86%", rot: "0deg", avatarX: "65%", avatarY: "62%" },
  { seatId: "right_1", x: "116%", y: "12%", rot: "180deg", avatarX: "35%", avatarY: "55%" },
  { seatId: "right_2", x: "116%", y: "36%", rot: "180deg", avatarX: "35%", avatarY: "55%" },
  { seatId: "right_3", x: "116%", y: "60%", rot: "180deg", avatarX: "35%", avatarY: "55%" },
  { seatId: "right_4", x: "116%", y: "86%", rot: "180deg", avatarX: "35%", avatarY: "55%" },
  { seatId: "top_1", x: "35%", y: "-10%", rot: "90deg", avatarX: "45%", avatarY: "75%" },
  { seatId: "top_2", x: "70%", y: "-10%", rot: "90deg", avatarX: "45%", avatarY: "75%" },
  { seatId: "bottom_1", x: "35%", y: "110%", rot: "-90deg", avatarX: "55%", avatarY: "45%" },
  { seatId: "bottom_2", x: "70%", y: "110%", rot: "-90deg", avatarX: "55%", avatarY: "45%" },
];

function getAvatarLabel(name) {
  if (!name || typeof name !== "string") {
    return "?";
  }

  return name.trim().charAt(0).toUpperCase() || "?";
}

function getBacRingColor(bac) {
  if (bac == null || !Number.isFinite(bac)) {
    return "rgba(255,255,255,0.18)";
  }

  if (bac < 0.02) return "#48BB78";
  if (bac < 0.05) return "#ECC94B";
  if (bac < 0.08) return "#ED8936";
  return "#F56565";
}

function getBacGlow(bac) {
  if (bac == null || !Number.isFinite(bac)) {
    return "none";
  }

  if (bac < 0.02) return "0 0 18px rgba(72, 187, 120, 0.35)";
  if (bac < 0.05) return "0 0 18px rgba(236, 201, 75, 0.35)";
  if (bac < 0.08) return "0 0 18px rgba(237, 137, 54, 0.40)";
  return "0 0 20px rgba(245, 101, 101, 0.45)";
}

export default function TavernTable({
  tableMaxW = "clamp(180px, calc(min(92vw, 1400px) * 0.26), 440px)",
  chairSize,
  tableRatio = 2 / 3,
  gap = 6,
  bearRugUrl,
  spilledBeerUrl,
  tableUrl,
  drinkers = [],
  chairUrl,
  showEmptyChairs = true,
  currentTurnSeatId = null,
  mySeatId = null,
  onSeatClick,
}) {
  const drinkerMap = Object.fromEntries(drinkers.map((drinker) => [drinker.seatId, drinker]));

  return (
    <Box w="full" display="grid" placeItems="start center" gap={gap}>
      <Box position="relative" w={tableMaxW}>
        {chairUrl &&
          SEAT_SLOTS.map((slot) => {
            const seat = drinkerMap[slot.seatId] ?? {
              seatId: slot.seatId,
              occupied: false,
              name: "",
              connected: false,
              isMine: false,
              lastBAC: null,
              readingCount: 0,
            };

            if (!showEmptyChairs && !seat.occupied) {
              return null;
            }

            const isCurrent = currentTurnSeatId === slot.seatId;
            const isMine = mySeatId === slot.seatId;
            const ringColor = isCurrent ? "#28ADFA" : getBacRingColor(seat.lastBAC);

            return (
              <Box
                key={slot.seatId}
                position="absolute"
                left={slot.x}
                top={slot.y}
                transform="translate(-50%, -50%)"
                w={chairSize}
                maxW="120px"
                minW="64px"
                aspectRatio={1}
                zIndex={2}
              >
                <Box
                  pointerEvents="none"
                  position="absolute"
                  inset={0}
                  transform={`rotate(${slot.rot})`}
                  bgImage={`url(${chairUrl})`}
                  bgRepeat="no-repeat"
                  bgSize="contain"
                  bgPosition="center"
                  opacity={seat.occupied ? 1 : 0.55}
                  filter="drop-shadow(0 10px 14px rgba(0,0,0,0.45))"
                  zIndex={1}
                />

                <Box
                  position="absolute"
                  left={slot.avatarX}
                  top={slot.avatarY}
                  transform="translate(-50%, -50%)"
                  zIndex={2}
                >
                  <VStack spacing={1}>
                    <Circle
                      size="clamp(42px, calc(min(92vw, 1400px) * 0.05), 68px)"
                      bg={
                        seat.occupied
                          ? "rgba(245, 222, 179, 0.96)"
                          : "rgba(255,255,255,0.08)"
                      }
                      border="3px solid"
                      borderColor={ringColor}
                      cursor="pointer"
                      transition="all 0.15s ease"
                      boxShadow={
                        isMine
                          ? "0 0 0 4px rgba(255,255,255,0.14)"
                          : getBacGlow(seat.lastBAC)
                      }
                      onClick={() => onSeatClick?.(slot.seatId)}
                      _hover={{
                        transform: "scale(1.05)",
                        bg: seat.occupied
                          ? "rgba(245, 222, 179, 1)"
                          : "rgba(255,255,255,0.14)",
                      }}
                    >
                      {seat.occupied ? (
                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                          color="#2A170E"
                          userSelect="none"
                        >
                          {getAvatarLabel(seat.name)}
                        </Text>
                      ) : (
                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                          color="rgba(255,255,255,0.75)"
                          userSelect="none"
                        >
                          +
                        </Text>
                      )}
                    </Circle>

                    <Text
                      fontSize="xs"
                      color="rgba(255,255,255,0.92)"
                      textAlign="center"
                      maxW="88px"
                      noOfLines={1}
                      userSelect="none"
                    >
                      {seat.occupied ? seat.name || "Occupied" : "Empty"}
                    </Text>

                    {seat.occupied && (
                      <Text
                        fontSize="10px"
                        color="rgba(255,255,255,0.68)"
                        textAlign="center"
                        userSelect="none"
                      >
                        {seat.lastBAC != null
                          ? `BAC ${Number(seat.lastBAC).toFixed(3)}`
                          : "No reading"}
                      </Text>
                    )}
                  </VStack>
                </Box>
              </Box>
            );
          })}

        <AspectRatio ratio={tableRatio} w="100%">
          <Box
            borderRadius="xl"
            borderWidth="2px"
            borderColor="rgba(42,23,14,0.35)"
            overflow="hidden"
            position="relative"
            bgImage={`url(${tableUrl})`}
            bgRepeat="no-repeat"
            bgSize="cover"
            bgPosition="center"
            boxShadow="
              inset 0 6px 12px rgba(255,255,255,0.05),
              inset 0 -12px 30px rgba(0,0,0,0.6),
              0 40px 40px rgba(0,0,0,0.5)
            "
          >
            <Box position="absolute" inset={0} bg="rgba(20,10,5,0.18)" />

            {spilledBeerUrl && (
              <Box
                pointerEvents="none"
                position="absolute"
                left="68%"
                top="22%"
                transform="translate(-50%, -50%) rotate(12deg)"
                w="38%"
                maxW="180px"
                aspectRatio={1}
                bgImage={`url(${spilledBeerUrl})`}
                bgRepeat="no-repeat"
                bgSize="contain"
                bgPosition="center"
                opacity={0.7}
                filter="drop-shadow(0 10px 14px rgba(0,0,0,0.35))"
              />
            )}
          </Box>
        </AspectRatio>

        {bearRugUrl && (
          <Box
            pointerEvents="none"
            position="absolute"
            left="50%"
            bottom="-44%"
            transform="translateX(-40%) rotate(-2deg)"
            w="135%"
            aspectRatio={1.25}
            bgImage={`url(${bearRugUrl})`}
            bgRepeat="no-repeat"
            bgSize="contain"
            bgPosition="center"
            opacity={0.9}
            filter="drop-shadow(0 22px 28px rgba(0,0,0,0.55))"
            zIndex={-1}
          />
        )}
      </Box>
    </Box>
  );
}
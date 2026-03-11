import { Box } from "@chakra-ui/react";

import archTexture from "../../../assets/textures/door_shadow.png";
import barCounter from "../../../assets/textures/Prop_Dining_Table.png";
import bearRug from "../../../assets/textures/Prop_Bear.png";
import spilledBeer from "../../../assets/textures/Prop_Spilled_Beer.png";
import chair from "../../../assets/textures/Prop_Chair.png";
import firePit from "../../../assets/textures/Prop_Firepit.png";
import messyRoundTable from "../../../assets/textures/Prop_Messy_Round_Table.png";
import squareFoodTable from "../../../assets/textures/Prop_Food_Square_Table.png";
import rotisserie from "../../../assets/textures/Prop_Rotisserie.png";
import Barrel from "../../../assets/textures/Prop_Barrel.png";
import Lamp from "../../../assets/textures/Prop_Lamp.png";
import stonefloorTexture from "../../../assets/textures/stone_floor_texture_dark.png";
import rusticTableTexture from "../../../assets/textures/rustic_wood_table_texture.png";

export const tavernDecorAssets = {
  stonefloorTexture,
  rusticTableTexture,
  bearRug,
  spilledBeer,
  chair,
};

const pitSize = "clamp(32px, calc(min(92vw, 1400px) * 0.18), 240px)";
const cornerPropSize = "clamp(32px, calc(min(92vw, 1400px) * 0.4), 440px)";

export function TavernSceneTopProps() {
  return (
    <Box
      w="100%"
      h="100%"
      position="relative"
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        position="relative"
        h="100%"
        w="auto"
        maxW="100%"
        aspectRatio={2 / 1}
        pointerEvents="none"
      >
        <Box
          as="img"
          src={barCounter}
          alt=""
          draggable={false}
          w="100%"
          h="100%"
          objectFit="contain"
          filter="drop-shadow(0 14px 22px rgba(0,0,0,0.55))"
        />
      </Box>

      <LampCluster left="40%" top="40%" />
      <LampCluster left="60%" top="40%" />

      <Box
        as="img"
        src={archTexture}
        alt=""
        draggable={false}
        position="absolute"
        top="0"
        left="0"
        pointerEvents="none"
        w="clamp(120px, calc(min(92vw, 1400px) * 0.3), 420px)"
        transform="translateX(-65%) rotate(90deg)"
        opacity={0.85}
        objectFit="contain"
      />

      <Box
        position="absolute"
        top="0"
        right="0"
        pointerEvents="none"
        w="clamp(32px, calc(min(92vw, 1400px) * 0.2), 150px)"
      >
        <Box
          as="img"
          src={Barrel}
          alt=""
          draggable={false}
          w="100%"
          h="auto"
          objectFit="contain"
          position="relative"
          zIndex={1}
          filter="drop-shadow(0 14px 18px rgba(0,0,0,0.35))"
        />

        <Box
          position="absolute"
          left="50%"
          top="50%"
          transform="translate(-50%, -30%)"
          w="160%"
          h="200%"
          bg={`
            radial-gradient(ellipse at 50% 20%,
              rgba(255,190,110,0.35) 0%,
              rgba(255,190,110,0.18) 35%,
              rgba(255,190,110,0.08) 55%,
              rgba(255,190,110,0.00) 75%
            )
          `}
          filter="blur(20px)"
          opacity={0.75}
          zIndex={0}
        />

        <Box
          as="img"
          src={Lamp}
          alt=""
          draggable={false}
          position="absolute"
          left="50%"
          top="50%"
          transform="translate(-50%, -130%)"
          w="65%"
          h="auto"
          objectFit="contain"
          zIndex={2}
          filter="brightness(0.8) contrast(1.1)"
        />
      </Box>
    </Box>
  );
}

function LampCluster({ left, top }) {
  return (
    <Box
      position="absolute"
      left={left}
      top={top}
      transform="translate(-50%, -50%)"
      pointerEvents="none"
    >
      <Box
        position="absolute"
        left="50%"
        top="95%"
        transform="translate(-50%, -50%)"
        w="clamp(120px, calc(min(92vw, 1400px) * 0.10), 220px)"
        h="clamp(60px, calc(min(92vw, 1400px) * 0.055), 140px)"
        borderRadius="999px"
        bg={`
          radial-gradient(ellipse at 50% 40%,
            rgba(255, 205, 130, 0.22) 0%,
            rgba(255, 205, 130, 0.10) 38%,
            rgba(255, 205, 130, 0.04) 58%,
            rgba(255, 205, 130, 0.00) 78%
          )
        `}
        filter="blur(14px)"
        mixBlendMode="soft-light"
        opacity={0.9}
        zIndex={0}
      />

      <Box
        as="img"
        src={Lamp}
        alt=""
        draggable={false}
        style={{ userSelect: "none" }}
        w="clamp(32px, calc(min(92vw, 1400px) * 0.18), 500px)"
        h="auto"
        objectFit="contain"
        position="relative"
        zIndex={1}
        opacity={0.95}
        filter="brightness(0.78) contrast(1.12) saturate(0.85) sepia(0.25)"
        mixBlendMode="multiply"
      />
    </Box>
  );
}

export function TavernSceneLeftProps() {
  return (
    <Box w="100%" h="100%" position="relative">
      <FirePit />
    </Box>
  );
}

export function TavernSceneRightProps() {
  return (
    <Box w="100%" h="100%" position="relative">
      <Box
        position="absolute"
        left="50%"
        bottom="8%"
        transform="translateX(-50%) translateY(-150%)"
        w={pitSize}
        aspectRatio={1}
        pointerEvents="none"
      >
        <Box
          position="absolute"
          inset="-45%"
          filter="blur(40px)"
          opacity={0.95}
          bg={`
            radial-gradient(circle at 50% 55%,
              rgba(255,170,70,0.45) 0%,
              rgba(255,190,95,0.26) 28%,
              rgba(255,190,95,0.12) 48%,
              rgba(255,190,95,0.00) 72%
            )
          `}
          zIndex={0}
        />
        <Box
          position="absolute"
          inset={0}
          bgImage={`url(${firePit})`}
          bgRepeat="no-repeat"
          bgSize="contain"
          bgPosition="center"
          filter="drop-shadow(0 28px 40px rgba(0,0,0,0.6))"
          zIndex={1}
        >
          <Box
            position="absolute"
            left="50%"
            top="50%"
            transform="translate(-50%, -50%) rotate(90deg)"
            w="clamp(120px, calc(min(92vw, 1400px) * 0.3), 420px)"
            aspectRatio={2.2}
            bgImage={`url(${rotisserie})`}
            bgRepeat="no-repeat"
            bgSize="contain"
            bgPosition="center"
            filter="drop-shadow(0 18px 24px rgba(0,0,0,0.55))"
            zIndex={2}
            pointerEvents="none"
          />
        </Box>
      </Box>
    </Box>
  );
}

export function TavernSceneBottomProps() {
  return (
    <Box w="100%" h="100%" position="relative">
      <Box
        pointerEvents="none"
        position="absolute"
        left="5"
        bottom="0%"
        w={cornerPropSize}
        aspectRatio={1}
        zIndex={1}
      >
        <Box
          position="absolute"
          inset={0}
          bgImage={`url(${messyRoundTable})`}
          bgRepeat="no-repeat"
          bgSize="contain"
          bgPosition="center"
          filter="drop-shadow(0 22px 30px rgba(0,0,0,0.55))"
        />
      </Box>

      <Box
        pointerEvents="none"
        position="absolute"
        right="5"
        bottom="0%"
        w={cornerPropSize}
        aspectRatio={1}
        zIndex={1}
      >
        <Box
          position="absolute"
          inset={0}
          bgImage={`url(${squareFoodTable})`}
          bgRepeat="no-repeat"
          bgSize="contain"
          bgPosition="center"
          filter="drop-shadow(0 22px 30px rgba(0,0,0,0.55))"
        />
      </Box>
    </Box>
  );
}

function FirePit() {
  return (
    <Box
      position="absolute"
      left="50%"
      bottom="8%"
      transform="translateX(-50%) translateY(-150%)"
      w={pitSize}
      aspectRatio={1}
      pointerEvents="none"
    >
      <Box
        position="absolute"
        inset="-45%"
        filter="blur(40px)"
        opacity={0.95}
        bg={`
          radial-gradient(circle at 50% 55%,
            rgba(255,170,70,0.45) 0%,
            rgba(255,190,95,0.26) 28%,
            rgba(255,190,95,0.12) 48%,
            rgba(255,190,95,0.00) 72%
          )
        `}
        zIndex={0}
      />
      <Box
        position="absolute"
        inset={0}
        bgImage={`url(${firePit})`}
        bgRepeat="no-repeat"
        bgSize="contain"
        bgPosition="center"
        filter="drop-shadow(0 28px 40px rgba(0,0,0,0.6))"
        zIndex={1}
      />
    </Box>
  );
}
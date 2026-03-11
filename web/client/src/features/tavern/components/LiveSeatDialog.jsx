import {
  Button,
  CloseButton,
  Dialog,
  HStack,
  Input,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";

export default function LiveSeatDialog({
  open,
  mode,
  seatId,
  nameInput,
  onNameInputChange,
  onOpenChange,
  onClaim,
  onRename,
  onLeave,
  onCancel,
}) {
  const hasName = !!nameInput.trim();

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            bg="#3B2416"
            color="#FAF1D9"
            borderWidth="1px"
            borderColor="rgba(255,255,255,0.12)"
          >
            <Dialog.Header>
              <Dialog.Title>
                {mode === "claim" ? "Claim Seat" : "Manage Seat"}
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <VStack align="stretch" gap={4}>
                <Text>Seat: {seatId ?? "—"}</Text>

                <Input
                  value={nameInput}
                  onChange={(e) => onNameInputChange(e.target.value)}
                  placeholder="Enter name"
                  bg="#FAF1D9"
                  color="#2A170E"
                />

                {mode === "claim" ? (
                  <Button
                    onClick={onClaim}
                    disabled={!hasName}
                    bg="#D6B98C"
                    color="#2A170E"
                    borderWidth="1px"
                    borderColor="#E9D7B7"
                    _hover={{ bg: "#E9D7B7" }}
                    _active={{ bg: "#C9A874" }}
                    _disabled={{ opacity: 0.45, cursor: "not-allowed" }}
                  >
                    Claim Seat
                  </Button>
                ) : (
                  <HStack>
                    <Button
                      onClick={onRename}
                      disabled={!hasName}
                      bg="#D6B98C"
                      color="#2A170E"
                      borderWidth="1px"
                      borderColor="#E9D7B7"
                      _hover={{ bg: "#E9D7B7" }}
                      _active={{ bg: "#C9A874" }}
                      _disabled={{ opacity: 0.45, cursor: "not-allowed" }}
                    >
                      Rename
                    </Button>

                    <Button
                      onClick={onLeave}
                      bg="transparent"
                      color="#FAF1D9"
                      borderWidth="1px"
                      borderColor="rgba(255,255,255,0.28)"
                      _hover={{ bg: "rgba(255,255,255,0.08)" }}
                      _active={{ bg: "rgba(255,255,255,0.12)" }}
                    >
                      Leave Seat
                    </Button>
                  </HStack>
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>

            <Dialog.Footer>
              <Button
                variant="ghost"
                onClick={onCancel}
                color="#E9D7B7"
                _hover={{ bg: "rgba(255,255,255,0.08)" }}
                _active={{ bg: "rgba(255,255,255,0.12)" }}
              >
                Cancel
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
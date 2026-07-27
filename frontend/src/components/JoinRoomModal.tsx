"use client";

import React from "react";
import RoomActionModal from "./RoomActionModal";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (roomId: number) => void;
}

export default function JoinRoomModal({ isOpen, onClose, onSuccess }: JoinRoomModalProps) {
  return (
    <RoomActionModal
      isOpen={isOpen}
      mode="join"
      onClose={onClose}
      onSuccess={(res) => onSuccess(res as number)}
    />
  );
}

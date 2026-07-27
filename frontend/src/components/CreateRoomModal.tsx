"use client";

import React from "react";
import RoomActionModal from "./RoomActionModal";
import { RoomResponse } from "@/lib/roomsApi";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (room: RoomResponse) => void;
}

export default function CreateRoomModal({ isOpen, onClose, onSuccess }: CreateRoomModalProps) {
  return (
    <RoomActionModal
      isOpen={isOpen}
      mode="create"
      onClose={onClose}
      onSuccess={(res) => onSuccess(res as RoomResponse)}
    />
  );
}

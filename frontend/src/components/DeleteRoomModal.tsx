"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface DeleteRoomModalProps {
  isOpen: boolean;
  roomName?: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteRoomModal: React.FC<DeleteRoomModalProps> = ({
  isOpen,
  roomName,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <h4 className="font-bold text-white text-base">Delete Studio Room?</h4>
        <p className="text-xs text-zinc-400">
          Are you sure you want to delete{" "}
          <span className="text-white font-semibold">{roomName || "this room"}</span>? This action is permanent and will end the session for all participants.
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-md shadow-red-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRoomModal;

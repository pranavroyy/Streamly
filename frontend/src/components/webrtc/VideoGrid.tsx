import React from "react";
import { VideoTile } from "./VideoTile";

export interface VideoTileInfo {
  userId: string;
  stream: MediaStream | null;
  label: string;
  isMuted: boolean;
  isCameraOff: boolean;
  connectionState?: RTCPeerConnectionState;
  isLocal: boolean;
}

interface VideoGridProps {
  tiles: VideoTileInfo[];
}

export const VideoGrid: React.FC<VideoGridProps> = ({ tiles }) => {
  const getGridClasses = (count: number) => {
    if (count <= 1) return "grid-cols-1 max-w-4xl mx-auto";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  };

  return (
    <div className={`grid gap-6 w-full ${getGridClasses(tiles.length)}`}>
      {tiles.map((tile) => (
        <VideoTile
          key={tile.userId}
          stream={tile.stream}
          label={tile.label}
          isLocal={tile.isLocal}
          isMuted={tile.isMuted}
          isCameraOff={tile.isCameraOff}
          connectionState={tile.connectionState}
        />
      ))}
    </div>
  );
};

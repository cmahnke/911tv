import React from "react";
import videojs from "video.js";
import { ChannelPlaylistPlugin, PluginsOptions } from "../classes/ChannelPlaylistPlugin";

import "video.js/dist/video-js.css";
import "./VideoJS.scss";

type Player = ReturnType<typeof videojs>;

type VideoJSProps = {
  options: typeof videojs.options;
  onReady?: (player: Player) => void;
  ref: React.RefObject<Player | null>;
};

export const VideoJS = ({ options, onReady, ref: playerRef }: VideoJSProps) => {
  const placeholderRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!playerRef.current) {
      const placeholderEl = placeholderRef.current!;
      const videoElement = placeholderEl.appendChild(document.createElement("video-js"));

      videojs.registerPlugin("channelPlaylistPlugin", ChannelPlaylistPlugin);

      const player = (playerRef.current = videojs(videoElement, options, () => {
        console.log("player is ready");
        if (onReady) {
          onReady(player);
        }
      }));
    } else {
      const player = playerRef.current;
      player.autoplay(options.autoplay);
      player.src(options.sources);
    }
  }, [options, onReady, playerRef]);

  React.useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return <div ref={placeholderRef} className="video-container"></div>;
};

export type VideoJSHandle = Player & {
  channelPlaylistPlugin: (options: PluginsOptions) => {
    dispose: () => void;
  };
};

export default VideoJS;

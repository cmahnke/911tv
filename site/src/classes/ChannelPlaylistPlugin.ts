import { DateTime } from "luxon";
import videojs from "video.js";
import Channel from "./Channel";
import Timer from "./Timer";

// Instead of videojs.PlayerOptions
type PluginsOptions = {
  channel: Channel;
  timer: Timer;
  callbacks?: {
    gap: () => void | undefined;
    ended: () => void | undefined;
    fault: () => void | undefined;
    meta: (meta: object) => void | undefined;
  };
};

const Plugin = videojs.getPlugin("plugin");

export default class ChannelPlaylistPlugin extends Plugin {
  _gapCallback: () => void | undefined;
  _endedCallback: () => void | undefined;
  _faultCallback: () => void | undefined;
  _metaCallback: (meta: object) => void | undefined;
  _channel: Channel;
  _timer: Timer;
  _fault: boolean = false;
  _preloadId: string | null;

  constructor(player: videojs.Player, options: PluginsOptions) {
    super(player);
    this._channel = options.channel;
    this._timer = options.timer;
    if ("callbacks" in options) {
      this._gapCallback = options.callbacks!.gap;
      this._endedCallback = options.callbacks!.ended;
      this._faultCallback = options.callbacks!.fault;
      this._metaCallback = options.callbacks!.meta;
    }

    console.log(options);
    this.registerEvents();
  }

  public reset() {
    //TODO: clean playlist here
  }

  private registerEvents(): void {
    this.player.on("ready", () => {
      console.log("Player is ready");
    });

    this.player.on("play", () => {
      console.log("got play event from plugin");
    });

    this.player.on("buffering", () => {
      this._faultCallback();
      this._fault = true;
    });

    this.player.on("stalled", () => {
      this._faultCallback();
      this._fault = true;
    });

    this.player.on("playing", () => {
      if (this._fault == true) {
        //TODO: We recover from an error, check if we need to skip
      }
    });
  }

  private start() {
    const time = this._timer.appTime;
    const video = this._channel.findVideo(time);
  }

  /*
  public handleEvent(eventName: string, event: object) {
    console.log(`Event: ${eventName}`, event)
  }
  */

  private removePreload(): void {
    if (this._preloadId !== null) {
      const link = document.getElementById(this._preloadId);

      if (link !== null) {
        link.remove();
      }
    }
  }

  private preload(url: URL): void {
    if (this._preloadId !== null) {
      this.removePreload();
    }
    const id: string = Math.random().toString(12).substring(4, 12);
    const preloadLink = document.createElement("link");

    preloadLink.id = id;
    preloadLink.href = url.toString();
    preloadLink.crossOrigin = "anonymous";
    preloadLink.rel = "preload";
    preloadLink.as = "object";
    document.head.appendChild(preloadLink);
    this._preloadId = id;
  }
}

class Next {
  // See https://stackoverflow.com/questions/45802988/typescript-use-correct-version-of-settimeout-node-vs-window
  timeout: ReturnType<typeof setTimeout>;

  constructor() {}
}

class ChannelPlaylist extends videojs.EventTarget {
  constructor(options = {}) {
    super();
  }
}

export { ChannelPlaylistPlugin };

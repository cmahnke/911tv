import { DateTime, Interval } from "luxon";
import videojs from "video.js";

import { Recording, Gap, Slot } from "./Slot";
import Channel from "./Channel";
import Timer from "./Timer";

// Instead of videojs.PlayerOptions
type PluginsOptions = {
  channel: Channel;
  timer: Timer;
  autostart?: boolean;
  callbacks?: {
    playing: () => void | undefined;
    gap: () => void | undefined;
    ended: () => void | undefined;
    fault: () => void | undefined;
    meta: (meta: string) => void | undefined;
  };
};

const Plugin = videojs.getPlugin("plugin");

export default class ChannelPlaylistPlugin extends Plugin {
  _playingCallback: () => void | undefined;
  _gapCallback: () => void | undefined;
  _endedCallback: () => void | undefined;
  _faultCallback: () => void | undefined;
  _metaCallback: (meta: string) => void | undefined;
  _channel: Channel;
  _timer: Timer;
  _fault: boolean = false;
  _preloadId: string | null;
  _autostart: boolean = true;
  _timeouts: ReturnType<typeof setTimeout>[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _eventHandlers: { [key: string]: (...args: any) => void } = {
    play: this.handlePlay,
    //playing: this.handlePlaying,
    ready: this.handleReady,
    timeupdate: this.handleTimeupdate,
    dispose: this.handleDispose,
    setChannel: this._setChannel
  };

  constructor(player: videojs.Player, options: PluginsOptions) {
    super(player);
    this._channel = options.channel;
    this._timer = options.timer;
    if ("autostart" in options) {
      this._autostart = options.autostart!;
    }

    if ("callbacks" in options) {
      this._playingCallback = options.callbacks!.playing;
      this._gapCallback = options.callbacks!.gap;
      this._endedCallback = options.callbacks!.ended;
      this._faultCallback = options.callbacks!.fault;
      this._metaCallback = options.callbacks!.meta;
    }

    console.log(options);
    this.registerEvents();
    this.loadFirst();
  }

  public reset() {
    //TODO: clean intervals, player and channel
    //like this._channel = null;
  }

  public static setChannel(player: videojs.Player, channel: Channel) {
    player.trigger("setchannel", channel);
  }

  private _setChannel(channel: Channel) {
    this.reset();
    this._channel = channel;
    console.log(`Switched to ${this._channel}`);
    this.loadFirst();
    if (this._autostart) {
      this.player.play();
    }
  }

  private registerEvents(): void {
    for (const [event, handler] of Object.entries(this._eventHandlers)) {
      this.player.on(event, handler);
    }

    if (this._autostart) {
      this.player.on("loadeddata", () => {
        this.player.play();
      });
    }

    this.player.on("buffering", () => {
      console.log("buffered");
      this._faultCallback();
      //TODO: Check if this cann also happen during the stream
    });

    this.player.on("stalled", () => {
      console.log("stalled");
      this._faultCallback();
      this._fault = true;
    });

    this.player.on("playing", () => {
      console.log("rolling");
      this._playingCallback();
      if (this._fault == true) {
        //TODO: We recover from an error, check if we need to skip
        this.sync();
      }
    });
  }

  private sync() {
    return;
    const expectedVideo = this._channel.findVideo(this._timer.appTime);
    if (expectedVideo !== undefined && expectedVideo instanceof Recording) {
      if (this.player.src() == (expectedVideo as Recording).src.toString()) {
        //Just ajust position
      } else {
        // We are in the wrong video
        //this.start()
      }
    } else if (expectedVideo instanceof Gap) {
      console.log("TODO");
    } else {
      throw new Error(`Unknown type: ${typeof expectedVideo}`);
    }
  }

  private handlePlay(): void {
    console.log("got play");
    //TODO: Find a way to test if the player contains source
    /*
    if (this.player.src() == "") {
      this._gapCallback();
    }
    */
  }

  private handlePlaying(): void {
    console.log("rolling");
    this._playingCallback();
  }

  private handleReady(): void {
    //this.loadFirst();
    console.log("Player ready");
  }

  private handleTimeupdate(update: object): void {
    console.log(update);
  }

  private handleDispose(): void {
    super.dispose();
    if (this._timeouts !== undefined) {
      for (const timeout of this._timeouts) {
        clearTimeout(timeout);
      }
    }
  }

  private showGap() {
    this._gapCallback();
  }

  private loadFirst(): void {
    let indexEntry;
    let video;
    if (!this._channel.checkStreamEnd(this._timer.appTime)) {
      indexEntry = this._channel.findIndexEntry(this._timer.appTime);
      video = indexEntry!.entry;
      if (video instanceof Recording) {
        if (video === undefined) {
          if (this._faultCallback !== undefined) {
            this._faultCallback();
          }
          console.log("Stream is undefined, dispaying static noise");
        }
      } else if (video instanceof Gap) {
        this._gapCallback();
        console.log("Showing gap");
      } else {
        throw new Error(`Unknown type: ${typeof video}`);
      }
    } else {
      if (this._endedCallback !== undefined) {
        this._endedCallback();
      }
      console.log("Event time passed, showing closedown.");
    }

    if (video !== undefined) {
      let start = 0;
      if (video.interval.start !== undefined && video.interval.start !== null) {
        start = (+this._timer.appTime - +video.interval.start) / 1000;
      }
      this.player.src((video as Recording).src.toString());
      this.player.currentTime(start);
      if ("info" in video && video.info !== undefined) {
        this._metaCallback(video.info.toString());
      }
      if (indexEntry !== undefined && indexEntry.next !== undefined) {
        this.setupNext(indexEntry.next, this._timer.appTime);
      }
    }
    this.player.play();
  }

  private setupNext(key: Interval, time: DateTime) {
    //TODO: setup next video here
    const next = this._channel.getIndexEntry(key);
    let nextRecording;
    if (next !== undefined) {
      if (next.entry instanceof Gap) {
        nextRecording = this._channel.findNextRecording(time);
      } else if (next.entry instanceof Recording) {
        nextRecording = next.entry;
      }
      if (nextRecording !== undefined) {
        this.preload(nextRecording.src);
      }
    }
  }

  private play(slot: Slot): void {
    if (slot instanceof Gap) {
      this._gapCallback();
    } else if (slot instanceof Recording) {
      console.log("TODO");
    }
  }

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

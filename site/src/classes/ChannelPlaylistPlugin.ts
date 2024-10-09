import { DateTime, Duration } from "luxon";
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

    console.log(`Initialized Playlist Plugin for ${this._channel.name}`, options);
    this.registerEvents();
    this.loadFirst();
  }

  public reset() {
    this.removePreload();
    if (this._timeouts !== undefined) {
      for (const timeout of this._timeouts) {
        clearTimeout(timeout);
      }
    }
    //TODO: clean intervals, player and channel
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

    this.player.on("buffering", () => {
      console.log("buffered");
      this._faultCallback();
      //TODO: Check if this can also happen during the stream
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
        this.sync();
        this._fault = false;
      }
    });
  }

  /**
   * Note, that `this` in the event handler reffer to the player
   */

  private handlePlay(): void {
    console.log("got play");
    //TODO: Find a way to test if the player contains source - this seems to be the player itself
    if (this.player.src() == "") {
      this._gapCallback();
    }
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
    //console.log(update);
  }

  private handleDispose(): void {
    this.reset();
    super.dispose();
    console.log(`Disposing Playlist Plugin for ${this._channel.name}`);
  }

  private showGap() {
    this._gapCallback();
  }

  private checkTime(time: DateTime): boolean {
    if (this._channel.checkStreamEnd(time)) {
      if (this._endedCallback !== undefined) {
        this._endedCallback();
      }
      console.log("Event time passed, showing closedown.");
      return true;
    }
    return false;
  }

  //Explicit video for first load, maybe add chunking here
  private loadFirst(): void {
    if (this.checkTime(this._timer.appTime)) {
      return;
    }

    const video = this._channel.findVideo(this._timer.appTime);
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
      throw new Error(`TODO: Unknown type: ${typeof video}`);
    }

    if (video !== undefined) {
      this.play(video);
    }
    /*
    if (video !== undefined && video instanceof Recording) {
      this.playRecording(video);
    }
    */
    //this.player.play();
  }

  private playRecording(recording: Recording): void {
    if (recording === undefined || !(recording instanceof Recording)) {
      throw new Error("Can't play Slot, not a valid Recording");
    }
    let start = 0;
    if (recording.interval.start !== undefined && recording.interval.start !== null) {
      start = (+this._timer.appTime - +recording.interval.start) / 1000;
    }
    this.player.src((recording as Recording).src.toString());
    this.player.currentTime(start);
    this.player.play();
    this._metaCallback(recording.info.toString());
  }

  private setupNext(): void {
    const time = this._timer.appTime;

    const next = this._channel.findNext(time);
    let nextRecording;
    if (next !== undefined) {
      if (next instanceof Gap) {
        nextRecording = this._channel.findNextRecording(time);
      } else if (next instanceof Recording) {
        nextRecording = next;
        this.preload(nextRecording.src);
      }

      const wait: Duration = next.interval.start!.diff(this._timer.appTime);
      this._timeouts.push(
        setTimeout(() => {
          this.play(next);
        }, wait.toMillis())
      );
      console.log(`Set timer for next slot (${typeof next}) video (${next?.interval.start}) in ${wait.toMillis()}ms`, next);
    }
  }

  private sync() {
    const expectedVideo = this._channel.findVideo(this._timer.appTime);
    if (this.player == null) {
      throw new Error("TODO: Player is null, set breakpoint to find the cause");
    }
    if (expectedVideo !== undefined && expectedVideo instanceof Recording) {
      if (this.player.src() == (expectedVideo as Recording).src.toString()) {
        const start = (+this._timer.appTime - +expectedVideo!.interval.start!) / 1000;
        const previousTime = this.player.currentTime();
        this.player.currentTime(start);
        console.log(`Resynced video stream from ${previousTime} to ${start}`);
      } else {
        this.play(expectedVideo);
      }
    } else if (expectedVideo instanceof Gap) {
      this._gapCallback();
    } else {
      throw new Error(`Unknown type: ${typeof expectedVideo}`);
    }
  }

  private play(slot: Slot): void {
    if (slot instanceof Gap) {
      this._gapCallback();
    } else if (slot instanceof Recording) {
      this.playRecording(slot as Recording);
    }
    this.setupNext();
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

class ChannelPlaylist extends videojs.EventTarget {
  constructor(options = {}) {
    super();
  }
}

export { ChannelPlaylistPlugin };

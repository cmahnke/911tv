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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _eventHandlers: { [key: string]: (...args: any) => void };
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
        console.log(`Clearing timeout ${timeout}`);
        clearTimeout(timeout);
      }
    }
    if (this._eventHandlers !== undefined) {
      for (const [event, handler] of Object.entries(this._eventHandlers)) {
        this.player.off(event, handler);
      }
    }
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
    this._eventHandlers = {
      play: this.handlePlay.bind(this),
      ready: this.handleReady.bind(this),
      playing: this.handlePlaying.bind(this),
      stalled: this.handleStalled.bind(this),
      buffering: this.handleBuffering.bind(this),
      timeupdate: this.handleTimeupdate.bind(this),
      setchannel: this.handleSetchannel.bind(this)
    };
    for (const [event, handler] of Object.entries(this._eventHandlers)) {
      this.player.on(event, handler);
    }
  }

  public dispose(): void {
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
      throw new Error(`Unknown type`);
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
      throw new Error("Player is null, this can happen in dev mode");
    }
    if (expectedVideo !== undefined) {
      if (expectedVideo instanceof Recording) {
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
        console.log(`Unknown type`);
      }
    } else {
      //TODO: Expected slot is undefined
      throw new Error(`TODO: Expected slot is undefined`);
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

  /* ---------------------- _eventHandlers ------------- */
  public handlePlay() {
    console.log(`Got play for ${this._channel.name}`);
    //TODO: Find a way to test if the player contains source - this seems to be the player itself
    if (this.player != null && this.player.src() == "") {
      this._gapCallback();
    }
    if (this.player != null) {
      console.warn("Player is null, this can happen in dev mode");
    }
  }

  public handleBuffering() {
    console.log(`Buffering`);
    this._faultCallback();
  }

  public handleStalled() {
    console.log(`Channel ${this._channel.name} is staled, syncing later`);
    this._gapCallback();
    this._fault = true;
  }

  public handlePlaying() {
    console.log(`Playing ${this._channel.name}`);
    if (this._fault == true) {
      this.sync();
      this._fault = false;
    }
    this._playingCallback();
  }

  public handleReady() {
    //this.loadFirst();
    console.log("Player ready");
  }

  public handleTimeupdate(update: object) {
    //console.log(update);
  }

  public handleSetchannel(channel: Channel) {
    this._setChannel(channel);
  }
}

class ChannelPlaylist extends videojs.EventTarget {
  constructor(options = {}) {
    super();
  }
}

export { ChannelPlaylistPlugin };

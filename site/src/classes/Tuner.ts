import Channel from "./Channel";
import type { Videos } from "./911TV.types";

class Tuner {
  private _channelList: string[] = [];
  public channels: { [key: string]: Channel } = {};
  protected _currentChannel: string = "";

  constructor(channels: { [key: string]: object }) {
    for (const [c, videos] of Object.entries(channels)) {
      this.channels[c] = new Channel(c, videos as Videos);
    }
    this._channelList = Object.keys(channels);
    this._currentChannel = this._channelList[0];
  }

  get channelNames(): string[] {
    return Object.keys(this.channels);
  }

  set station(channel: string) {
    const station = channel.toUpperCase();
    if (station in this.channels) {
      this._currentChannel = station;
    } else {
      throw new Error(`Not a valid channel: ${station}`);
    }
  }

  get channel(): Channel {
    return this.channels[this._currentChannel];
  }

  get station(): string {
    return this._currentChannel;
  }

  public next(): string {
    const i = this._channelList.indexOf(this._currentChannel);
    if (i == this._channelList.length - 1) {
      this._currentChannel = this._channelList[0];
    } else {
      this._currentChannel = this._channelList[i + 1];
    }
    return this._currentChannel;
  }

  public previous(): string {
    const i = this._channelList.indexOf(this._currentChannel);
    if (i == 0) {
      this._currentChannel = this._channelList[this._channelList.length - 1];
    } else {
      this._currentChannel = this._channelList[i - 1];
    }
    return this._currentChannel;
  }

  public zap(direction: boolean): string {
    if (direction) {
      this.next();
    } else {
      this.previous();
    }
    return this._currentChannel;
  }
}

export default Tuner;

import { DateTime } from "luxon";
import Channel from "./Channel";
import type { Videos, InternalVideo } from "./911TV.types";

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

  set channel(channel: string) {
    if (channel in this.channels) {
      this._currentChannel = channel;
    } else {
      throw new Error("Not a valid channel!");
    }
  }

  get channel(): string {
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

  public getCurrentVideo(time: DateTime): InternalVideo | undefined {
    return this.channels[this._currentChannel].getForTime(time);
  }

  // Just for backward compatibility - remove later
  public parseProgramms(chan: string, time: DateTime) {
    return this.channels[this._currentChannel].getForTime(time);
  }

  public checkStreamEnd(channel: string, time: DateTime): boolean {
    return this.channels[channel].checkStreamEnd(time);
  }
}

export default Tuner;

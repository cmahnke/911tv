import { DateTime } from "luxon";
import Channel from "./Channel";
import type { Videos, InternalVideo } from "./911TV.types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Tuner {
  private _channelList: string[] = [];
  public channels: { [key: string]: Channel } = {};
  protected _currentChannel: string = "";

  constructor(channels: { [key: string]: object }) {
    for (const [c, videos] of Object.entries(channels)) {
      this.channels[c] = new Channel(videos as Videos);
    }
    this._channelList = Object.keys(channels);
    this._currentChannel = this._channelList[0];
  }

  get channelNames(): string[] {
    return Object.keys(this.channels);
  }

  set channel(channel: string) {
    if (channel in Object.keys(this.channels)) {
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

  public zap(direction: boolean) {
    if (direction) {
      this.next();
    } else {
      this.previous();
    }
  }

  public getCurrentVideo(time: DateTime): InternalVideo | undefined {
    return this.channels[this._currentChannel].getForTime(time);
  }
}

export default Tuner;

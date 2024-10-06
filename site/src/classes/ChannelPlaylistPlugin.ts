import videojs from "video.js";

type PlayerOptions = typeof videojs.options;

const Plugin = videojs.getPlugin("plugin");

export default class ChannelPlaylistPlugin extends Plugin {
  _gapCallback: () => void | undefined;
  _endedCallback: () => void | undefined;

  constructor(player: videojs.Player, options: videojs.PlayerOptions) {
    super(player);
  }

  set gapCallback(fn: () => void) {
    this._gapCallback = fn;
  }

  set endedCallback(fn: () => void) {
    this._endedCallback = fn;
  }
}

export { ChannelPlaylistPlugin };

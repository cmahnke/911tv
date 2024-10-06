import { DateTime, Interval, Duration } from "luxon";

type MediaType = "video/mp4";

class Slot {
  protected _interval: Interval;

  constructor(start: DateTime, end: DateTime) {
    this._interval = Interval.fromDateTimes(start, end);
  }

  get duration(): Duration {
    return this._interval.toDuration();
  }

  get interval(): Interval {
    return this._interval;
  }

  get start(): DateTime {
    return this._interval.start!;
  }

  get end(): DateTime {
    return this._interval.end!;
  }
}

class Recording extends Slot {
  public src: URL;
  public info: URL | undefined;
  public type: MediaType;

  constructor(start: DateTime | string, duration: number, src: URL, type: MediaType = "video/mp4", info?: URL) {
    let s: DateTime;
    if (start instanceof DateTime) {
      s = start as DateTime;
    } else {
      s = DateTime.fromISO(start as string);
    }
    const end = s.plus(Duration.fromMillis(duration, {}));
    super(s, end);
    this.src = src;
    this.info = info;
    this.type = type;
  }
}

class Gap extends Slot {}

export { Slot, Recording, Gap, MediaType };

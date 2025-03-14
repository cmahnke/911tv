import { DateTime, Interval, Duration } from "luxon";

import type { Videos, JSONRecording } from "./911TV.types";
import { Recording, Gap, Slot } from "./Slot";

type TimeIndexEntry = {
  interval: Interval;
  entry: Recording | Gap;
  excess?: number;
};

class Channel {
  public name: string;
  private _index: TimeIndexEntry[] = [];
  private _interval: Interval;
  private _indexInitilized: boolean;

  constructor(name: string, videos: Videos) {
    this.name = name;
    const start = DateTime.fromISO(Object.keys(videos)[0]);
    const end = this.getStreamEnd(videos);
    this._interval = Interval.fromDateTimes(start, end as DateTime);

    this.indexVideos(videos);
  }

  get start(): DateTime {
    return this._interval.start!;
  }

  get end(): DateTime {
    return this._interval.end!;
  }

  private getStreamEnd(videos: Videos): DateTime | undefined {
    if ("end" in videos && videos["end"] !== undefined && videos["end"] !== null) {
      if (DateTime.fromISO(videos["end"] as string).isValid) {
        return DateTime.fromISO(videos["end"] as string);
      }
    }
    throw new Error("Couldn't get end date");
  }

  private indexVideos(videos: Videos) {
    // Create index entries
    let times = Object.keys(videos);
    times = times.filter(function (e) {
      return e !== "end";
    });
    times.sort((date1: string, date2: string) => new Date(date1).getTime() - new Date(date2).getTime());
    for (const time of times) {
      const entry = videos[time] as JSONRecording;
      const record = new Recording(time, entry.duration, new URL(entry.video_url.src), entry.video_url.type, new URL(entry.meta_url));
      this._index.push({ interval: record.interval, entry: record });
    }
    //this.calculateGaps();
  }

  private calculateGaps(): void {
    // Calculate gaps
    const gaps: TimeIndexEntry[] = [];
    const d = Duration.fromMillis(1, {});
    for (let i = 0; i < this._index.length; i++) {
      if (i > 0) {
        const cs = this._index[i].interval.start!;
        const pe = this._index[i - 1].interval.end!;
        if (this._index[i - 1].interval.overlaps(this._index[i].interval)) {
          const intersection = this._index[i - 1].interval.intersection(this._index[i].interval)!;
          const length = intersection.toDuration();
          this._index[i - 1].interval = Interval.fromDateTimes(
            this._index[i - 1].interval.start!,
            this._index[i - 1].interval.end!.minus(length).minus(d)
          );
          this._index[i - 1].excess = length.minus(d).toMillis();
        } else if (!this._index[i].interval.abutsEnd(this._index[i - 1].interval)) {
          const gap: Gap = new Gap(pe.plus(d), cs.minus(d));
          gaps.push({ interval: gap.interval, entry: gap });
        }
      }
    }
    this._index.push(...gaps);
    this._index = this._index.sort(Channel.indexSorter);
  }

  private initIndex(): void {
    if (!this._indexInitilized) {
      this.calculateGaps();
      this._indexInitilized = true;
    }
  }

  private static indexSorter(entry1: TimeIndexEntry, entry2: TimeIndexEntry): number {
    if (+entry1.interval.start! > +entry2.interval.start!) {
      return 1;
    }
    if (+entry1.interval.start! < +entry2.interval.start!) {
      return -1;
    }
    return 0;
  }

  public findIndexEntry(time: DateTime): TimeIndexEntry | undefined {
    this.initIndex();
    const video = this._index.find((element) => element["interval"].contains(time));
    if (video === undefined) {
      if (Interval.fromDateTimes(this.start, this.end!).contains(time)) {
        throw new Error(`Entry for ${time.toISO()} missing from ${this.name}`);
      }
    }
    return video;
  }

  public getIndexEntry(interval: Interval): TimeIndexEntry | undefined {
    this.initIndex();
    return this._index.find((element) => element["interval"] == interval);
  }

  public findVideo(time: DateTime): Recording | Gap | undefined {
    return this.findIndexEntry(time)?.entry;
  }

  public findNext(time: DateTime): Slot | undefined {
    this.initIndex();
    const indexEntry = this._index.find((element) => element["interval"].isAfter(time));
    return indexEntry?.entry;
  }

  public findNextRecording(time: DateTime): Recording | undefined {
    this.initIndex();
    const indexEntry = this._index.find((element) => element.entry instanceof Recording && element["interval"].isAfter(time));
    return indexEntry?.entry as Recording;
  }

  public findRemaining(time: DateTime): Slot[] | undefined {
    this.initIndex();
    let videos = this._index.filter((element) => element["interval"].contains(time) || element["interval"].isAfter(time));
    videos = videos.sort(Channel.indexSorter);
    return videos.map((v) => v.entry);
  }

  public at(time: DateTime): [Slot, number] | undefined {
    this.initIndex();
    const video = this.findVideo(time);
    if (video === undefined) {
      return undefined;
    }
    return [video, (+time - +video.interval.start!) / 1000];
  }

  public checkStreamEnd(time: DateTime): boolean {
    if (+time > +this.end) {
      return true;
    }
    return false;
  }

  // This can be used to get fragments of videos, load the first 30 secs as chunk, and the preload
  static generateQueryParams(start: string, length: string): string {
    const defaultLength = 35;
    const prefix = "?t=";
    const suffix = "&ignore=x.mp4";
    if (length === undefined || length === null) {
      length = defaultLength.toString();
    }
    //?t=4226/4261&ignore=x.mp4
    return `${prefix}${start}/${start + length}${suffix}`;
  }
}

export default Channel;

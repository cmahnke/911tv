import { DateTime, Interval, Duration } from "luxon";

import type { Videos, InternalVideo, JSONRecording, JSONRecordingVideoURL } from "./911TV.types";
import { Recording, Gap } from "./Slot";

type TimeIndexEntry = {
  interval: Interval;
  entry: Recording | Gap;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Channel {
  protected name: string;
  protected videos;
  protected _index: TimeIndexEntry[] = [];
  private _interval: Interval;

  constructor(name: string, videos: Videos) {
    this.name = name;
    this.videos = videos;
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
        } else if (!this._index[i].interval.abutsEnd(this._index[i - 1].interval)) {
          const gap: Gap = new Gap(pe.plus(d), cs.minus(d));
          gaps.push({ interval: gap.interval, entry: gap });
        }
      }
    }
    this._index.push(...gaps);
    // This is just for easier debugging
    this._index = this._index.sort((entry1: TimeIndexEntry, entry2: TimeIndexEntry) => {
      if (+entry1.interval.start! > +entry2.interval.start!) {
        return 1;
      }
      if (+entry1.interval.start! < +entry2.interval.start!) {
        return -1;
      }
      return 0;
    });
  }

  public findVideo(time: DateTime): Recording | Gap | undefined {
    const video = this._index.find((element) => element["interval"].contains(time));
    if (video === undefined) {
      if (Interval.fromDateTimes(this.start, this.end!).contains(time)) {
        throw new Error(`Entry for ${time.toISO()} missing from ${this.name}`);
      }
    }
    return video?.entry;
  }

  public getForTime(time: DateTime): InternalVideo | undefined {
    const video = this.findVideo(time);
    //TODO: Handle Gaps here
    if (video === undefined || video instanceof Gap) {
      return undefined;
    }
    return Channel.convertEntry(time, video);
  }

  static convertEntry(time: DateTime, record: Recording): InternalVideo {
    let start = 0;
    if (record.interval.start !== undefined && record.interval.start !== null) {
      start = +time - +record.interval.start;
    }
    const video: InternalVideo = { start: start / 1000, url: { src: record.src.toString(), type: record.type } };
    if (record.info !== undefined) {
      video["info"] = record.info.toString();
    }

    if (record.interval.start !== undefined && record.interval.start !== null) {
      video["startTime"] = record.interval.start!.toISO()!;
    }
    return video;
  }

  //TODO: This is just a port from App.jsx - just for reference
  /*
  private parseProgramms(videos: Videos, time: DateTime, offset: number | undefined): InternalVideo | undefined {
    //This is just here to silence the compiler
    const convert = (urlEntry: JSONRecordingVideoURL): { src: string; type: string } => {
      return { src: urlEntry.src.toString(), type: urlEntry.type };
    };

    let times = Object.keys(videos);
    times = times.filter(function (e) {
      return e !== "end";
    });
    times.sort((date1: string, date2: string) => new Date(date1).getTime() - new Date(date2).getTime());
    for (let i = 0; i < times.length; i++) {
      if (DateTime.fromISO(times[i]) <= time && DateTime.fromISO(times[i + 1]) > time) {
        if (offset === undefined || offset === null || !Number.isInteger(offset)) {
          offset = 0;
        }
        const entry = videos[times[i + offset]] as JSONRecording;

        const video: InternalVideo = { start: (+time - +DateTime.fromISO(times[i])) / 1000, url: convert(entry["video_url"]) };
        if ("video_url" in entry) {
          video["url"] = convert(entry["video_url"]);
        }
        if ("meta_url" in entry) {
          video["info"] = entry["meta_url"].toString();
        }
        // Fix possible data issues
        if (video["url"]["type"] === undefined || video["url"]["type"] == null) {
          video["url"]["type"] = "video/mp4";
        }
        video["startTime"] = times[i + offset];

        return video;
      }
    }
  }
  */

  public checkStreamEnd(time: DateTime): boolean {
    if (+time > +this.end) {
      return true;
    }
    return false;
  }
}

export default Channel;

import { DateTime, Interval, Duration } from "luxon";

import type { Videos, InternalVideo, JSONRecording, JSONRecordingVideoURL } from "./911TV.types";
import { Recording, Gap } from "./Slot";

type TimeIndexEntry = {
  interval: Interval;
  entry: Recording | Gap;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Channel {
  protected videos;
  protected index: TimeIndexEntry[] = [];
  protected end: DateTime | undefined;

  constructor(videos: Videos) {
    this.videos = videos;
    this.end = this.getStreamEnd(videos);
    this.indexVideos(videos);
  }

  private getStreamEnd(videos: Videos): DateTime | undefined {
    if ("end" in videos && videos["end"] !== undefined && videos["end"] !== null) {
      if (DateTime.fromISO(videos["end"] as string).isValid) {
        return DateTime.fromISO(videos["end"] as string);
      }
    }
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
      this.index.push({ interval: record.interval, entry: record });
    }
    // Calculate gaps
    const gaps = [];
    const d = Duration.fromMillis(1, {});
    for (let i = 0; i < this.index.length; i++) {
      if (i > 0) {
        const cs = this.index[i].interval.start!;
        const pe = this.index[i - 1].interval.end!;
        if (!this.index[i].interval.abutsEnd(this.index[i - 1].interval)) {
          const interval = Interval.fromDateTimes(pe.plus(d), pe.minus(d));
          gaps.push({ interval: interval, entry: { duration: interval.toDuration() } });
        } else if (this.index[i - 1].interval.overlaps(this.index[i].interval)) {
          const intersection = this.index[i - 1].interval.intersection(this.index[i].interval)!;
          const length = intersection.toDuration();

          this.index[i - 1].interval = Interval.fromDateTimes(
            this.index[i - 1].interval.start!,
            this.index[i - 1].interval.end!.minus(length)
          );
        }
      }
    }
  }

  public findVideo(time: DateTime): Recording | Gap | undefined {
    const video = this.index.find((element) => element["interval"].contains(time));
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
    const video: InternalVideo = { start: start, url: { src: record.src, type: record.type } };
    if (record.info !== undefined) {
      video["info"] = record.info.toString();
    }

    if (record.interval.start !== undefined && record.interval.start !== null) {
      video["startTime"] = record.interval.start!.toISO()!;
    }
    return video;
  }

  //TODO: This is just a port from App.jsx - just for reference
  private parseProgramms(videos: Videos, time: DateTime, offset: number): InternalVideo | undefined {
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

        const video: InternalVideo = { start: (+time - +DateTime.fromISO(times[i])) / 1000, url: entry["video_url"] };
        if ("video_url" in entry) {
          video["url"] = entry["video_url"];
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

  //public getVideo
}

export default Channel;

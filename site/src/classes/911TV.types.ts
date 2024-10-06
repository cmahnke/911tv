import { DateTime } from "luxon";

import { MediaType } from "./Slot";

/* These represent the JSON we import */
type JSONRecordingVideoURL = {
  src: URL;
  type: MediaType;
};

type JSONRecording = {
  video_url: JSONRecordingVideoURL;
  meta_url: URL;
  duration: number;
  startTime?: DateTime;
};

/* This is the legacy internal format */

type InternalVideo = {
  url: {
    src: string;
    type: string;
  };
  info?: string;
  startTime?: string;
  start: number;
};

type Videos = { [key: string]: JSONRecording | string };

export { MediaType, JSONRecording, JSONRecordingVideoURL, InternalVideo, Videos };

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

type Videos = { [key: string]: JSONRecording | string };

/* This is the legacy internal format. Just for backward compatibility - remove later */
/*
type InternalVideo = {
  url: {
    src: string;
    type: string;
  };
  info?: string;
  startTime?: string;
  start: number;
};
*/
export { MediaType, JSONRecording, JSONRecordingVideoURL, Videos };

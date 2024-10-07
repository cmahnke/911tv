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

export { MediaType, JSONRecording, JSONRecordingVideoURL, Videos };

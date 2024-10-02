import { useEffect, useRef } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { isMobileSafari } from "react-device-detect";
import CookieConsent, { getCookieConsentValue } from "react-cookie-consent";
import VideoJS from "./components/VideoJS.jsx";
import TVStatic from "./components/TVStatic.jsx";
import Teletext, { subTitlesPageNr } from "./components/Teletext.jsx";
import { DateTime } from "luxon";
//import JSONCrush from 'jsoncrush';
//import LZString from 'lz-string';
import Timer from "./classes/Timer.js";
import "@fontsource/press-start-2p";
import "./App.scss";
import urlsImport from "./assets/json/urls.json";
import pagesImport from "./assets/json/pages.json";

const consentCookieName = "iaConsent";
// Length of video chunks to request, longer times take longer to load
const chunkLength = 90;

function parseJson(json) {
  /*
  if (typeof json == "object" && Object.keys(json).length == 2) {
    if ('type' in json && json.type === 'lzstring') {
      return JSON.parse(JSONCrush.uncrush(json['content']));
    } else if ('type' in json && json.type === 'jsoncrush') {
      return JSON.parse(LZString.decompress(json['content']));
    }
  }
  */
  return json;
}

function App() {
  //State without React state
  var powerOn = true;
  var muted = false;
  var teletextOn = true;

  const audioContext = new AudioContext();
  const playerRef = useRef(null);
  const rootRef = useRef(null);
  const tvFrameRef = useRef(null);
  const noiseRef = useRef(null);
  const teletextRef = useRef(null);
  const infoRef = useRef(null);
  const infoContainerRef = useRef(null);
  const audioToggleRef = useRef(null);

  const urls = parseJson(urlsImport);
  const pages = parseJson(pagesImport);

  const channels = Object.keys(urls.channels);
  var channel = channels[0];
  var reset = false;
  var currentVideo = {};

  // URL params are 'c' (channel), 'r' (reset) and 't' (time)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("c") !== null && urlParams.get("c") !== undefined) {
    channel = urlParams.get("c");
  }
  if (urlParams.get("r") !== null && urlParams.get("r") !== undefined) {
    reset = true;
  }
  if (urlParams.get("t") !== null && urlParams.get("t") !== undefined) {
    reset = urlParams.get("t");
  }
  //TODO: This is a dirty hack and doesn't work, since it probably triggers a rerender
  //if (urlParams.get('r') !== null || urlParams.get('t') !== null) {
  //  if (window.location.href.includes('?')) {
  //    const curLoc = window.location.href;
  //    window.location.href = curLoc.replace(/(.*?)\?(t|r).*/g, "$1");
  //  }
  //}

  /*
   * Dates and times of video URLs are in UTC,
   * Client Time is called local time, timezone doesn't matter
   * App time is the UTC time of the ongoing event, it needs to be convertet into EDT
   */

  const startDate = DateTime.fromISO(urls.metadata.start);
  const endDate = DateTime.fromISO(urls.metadata.end);
  const timer = new Timer(startDate, endDate, urls.metadata.timezone, reset);
  if (subTitlesPageNr in pages) {
    console.log(
      `Can't initialize subtitles page, number ${subTitlesPageNr} has content page`,
    );
  } else {
    pages.push({ number: subTitlesPageNr, markdown: urls.events });
  }

  const videoEventHandler = [
    {
      name: "play",
      handler: () => {
        console.log("Got play event");
      },
    },
    {
      name: "playing",
      handler: () => {
        hideNoise();
      },
    },
    {
      name: "stalled",
      handler: () => {
        showNoise();
      },
    },
    {
      name: "buffering",
      handler: () => {
        showNoise();
      },
    },
    {
      name: "loadeddata",
      handler: () => {
        playerRef.current.play();
      },
    },
    {
      name: "timeupdate",
      handler: () => {
        checkVideoPosition();
      },
    },
  ];

  const router = createHashRouter([
    {
      path: "/:page?",
      element: (
        <Teletext
          ref={teletextRef}
          pages={pages}
          timer={timer}
          channel={channel}
        />
      ),
    },
  ]);

  function playVideo() {
    playerRef.current.currentTime(currentVideo["start"]);
    playerRef.current.play();
    //TODO: Calculate the start time in seconds depending on `appTime` ond `chunkLength`
    /*
    let videoTimestamp = DateTime.fromISO(currentVideo['startTime']);
    let startTime = timer.appTime.diff(videoTimestamp).as('milliseconds') / 1000;
    */
  }

  // Use `offset` to get the previuos (`-1`) or next (`1`) video
  function parseProgramms(chan, time, offset) {
    function generateQueryParams(start, length) {
      const defaultLength = 35;
      const prefix = "?t=";
      const suffix = "&ignore=x.mp4";
      if (length === undefined || length === null) {
        length = defaultLength;
      }
      //?t=4226/4261&ignore=x.mp4
      return `${prefix}${start}/${start + length}${suffix}`;
    }

    //All times from `urls.json` are UTC
    let times = Object.keys(urls.channels[chan]);
    times = times.filter(function (e) {
      return e !== "end";
    });
    times.sort((date1, date2) => new Date(date1) - new Date(date2));

    for (let i = 0; i < times.length; i++) {
      if (
        DateTime.fromISO(times[i]) <= time &&
        DateTime.fromISO(times[i + 1]) > time
      ) {
        if (
          offset === undefined ||
          offset === null ||
          !Number.isInteger(offset)
        ) {
          offset = 0;
        }
        let entry = urls.channels[chan][times[i + offset]];

        let video = { start: (time - DateTime.fromISO(times[i])) / 1000 };
        if ("video_url" in entry) {
          video["url"] = entry["video_url"];
        }
        if ("meta_url" in entry) {
          video["info"] = entry["meta_url"];
        }
        // Fix possible data issues
        if (
          video["url"]["type"] === undefined ||
          video["url"]["type"] == null
        ) {
          video["url"]["type"] = "video/mp4";
        }
        video["startTime"] = times[i + offset];
        console.log("Returning program " + time, video);
        return video;
      }
    }
  }

  function zapChannel(e, direction) {
    if (!powerOn) {
      return;
    }
    var i = channels.indexOf(channel);
    var logPrefix;
    if (direction) {
      if (i == 0) {
        channel = channels[channels.length - 1];
      } else {
        channel = channels[i - 1];
      }
      logPrefix = "Next channel (down), now ";
    } else {
      if (i == channels.length - 1) {
        channel = channels[0];
      } else {
        channel = channels[i + 1];
      }
      logPrefix = "Previous channel (up), now ";
    }
    teletextRef.current.setChannel(channel);
    currentVideo = parseProgramms(channel, timer.appTime);
    console.log(`${logPrefix}${channel} `, currentVideo);
    showNoise("immediately");
    playerRef.current.src(currentVideo["url"]);
    playerRef.current.currentTime(currentVideo["start"]);
  }

  function checkStreamEnd(channel) {
    let endTime = timer.endDate;
    if (
      "last" in urls.channels[channel] &&
      urls.channels[channel]["end"] !== undefined &&
      urls.channels[channel]["end"] !== null
    ) {
      endTime = DateTime.fromISO(urls.channels[channel]["end"]);
    }
    if (timer.appTime > endTime) {
      return true;
    }
    return false;
  }

  function checkVideoPosition() {
    //TODO: Check if we're near the end of this video
    //console.log(playerRef.current.currentTime());
  }

  function setTitle(e, title) {
    if (e !== undefined && e.target !== undefined) {
      e.target.title = title;
    }
  }

  function showNoise(className) {
    noiseRef.current.show(className);
  }

  function hideNoise() {
    if (powerOn) {
      noiseRef.current.hide();
    }
  }

  function toggleAudio(e) {
    if (!powerOn) {
      return;
    }
    console.log("Toggleing audio");
    if (!audioStatus()) {
      enableAudio();
      setTitle(e, "Audio enabled");
    } else {
      disableAudio();
      setTitle(e, "Audio disabled");
    }
  }

  function enableAudio() {
    if (!powerOn) {
      return;
    }
    muted = false;
    audioContext.resume();
    playerRef.current.volume(1);
    noiseRef.current.unmute();
    audioToggleRef.current.classList.remove("disabled");
    audioToggleRef.current.classList.add("enabled");
  }

  function disableAudio(fade) {
    muted = true;
    audioContext.suspend();
    playerRef.current.volume(0);
    noiseRef.current.mute();
    audioToggleRef.current.classList.remove("enabled");
    audioToggleRef.current.classList.add("disabled");
    console.log("Audio is suspended");
  }

  function audioStatus() {
    if (audioContext.state === "suspended" || muted) {
      return false;
    }
    return true;
  }

  function toggleFullscreen() {
    if (
      document.fullscreenElement ||
      tvFrameRef.current.getAttribute("class") == "fullscreen"
    ) {
      document.exitFullscreen();
      console.log("Exiting Fullscreen");
    } else {
      console.log("Entering Fullscreen");
      rootRef.current.requestFullscreen();
    }
  }

  /*
  function toggleInfoContainer() {
    infoContainerRef.current.classList.toggle('hide');
    infoContainerRef.current.classList.toggle('show');
  }
  */

  function showInfoContainer() {
    infoContainerRef.current.classList.remove("hide");
    infoContainerRef.current.classList.add("show");
  }

  function hideInfoContainer() {
    infoContainerRef.current.classList.add("hide");
    infoContainerRef.current.classList.remove("show");
  }

  function toggleInfo() {
    if (infoRef.current.classList.contains("show")) {
      infoRef.current
        .querySelector("div a")
        .setAttribute("href", parseProgramms(channel, timer.appTime)["info"]);
    }
    infoRef.current.classList.toggle("hide");
    infoRef.current.classList.toggle("show");
  }

  function on() {
    powerOn = true;
    //teletextRef.current.show();
    noiseRef.current.hide("immediately");
    showInfoContainer();
    enableAudio();
  }

  function off() {
    teletextRef.current.hide();
    noiseRef.current.changeMode("static");
    noiseRef.current.show("immediately");
    hideInfoContainer();
    disableAudio();
    powerOn = false;
  }

  function togglePower() {
    if (powerOn) {
      off();
    } else {
      on();
    }
  }

  function toggleTeletext(e) {
    if (!powerOn) {
      return;
    }
    if (teletextOn) {
      teletextRef.current.hide();
      teletextOn = false;
      setTitle(e, "Teletext disabled");
    } else {
      teletextRef.current.show();
      teletextOn = true;
      setTitle(e, "Teletext enabled");
    }
  }

  useEffect(() => {
    if (checkStreamEnd(channel)) {
      hideInfoContainer();
      teletextRef.current.hide();
      console.log("Event time passed, displaying test card.");
      noiseRef.current.changeMode("closedown");
    }
  });

  useEffect(() => {
    if (getCookieConsentValue(consentCookieName)) {
      playVideo();
    }
  }, []);

  if (!checkStreamEnd(channel)) {
    currentVideo = parseProgramms(channel, timer.appTime);
    var stream_info;
    if (currentVideo === undefined) {
      currentVideo = {};
      console.log("Stream is undefined, dispaying static noise");
    } else if ("info" in currentVideo && currentVideo["info"] !== undefined) {
      stream_info = currentVideo["info"];
    }
  } else {
    currentVideo = {};
    console.log("Event time passed, using empty video.");
  }

  // See https://videojs.com/guides/react/
  var videoJsOptions = {
    autoplay: false,
    controls: true,
    fill: true,
    muted: false,
    preload: "auto",
    sources: [currentVideo["url"]],
  };

  return (
    <>
      <div id="container" ref={rootRef}>
        <div id="tv-frame" ref={tvFrameRef}>
          <div id="tv-border"></div>
          <div id="tube">
            <RouterProvider router={router} />
            <div ref={infoContainerRef} className="show" id="info-container">
              <div ref={infoRef} id="info" className="hide">
                <button
                  type="button"
                  className="button toggle-info"
                  onClick={toggleInfo}
                >
                  <i className="info-icon"></i>
                </button>
                <div className="info-text">
                  <a target="_blank" rel="noreferrer" href={stream_info}>
                    Stream Metadata
                  </a>
                </div>
              </div>
            </div>
            <TVStatic
              ref={noiseRef}
              timer={timer}
              id="tv-static"
              className="show"
            />
            <VideoJS
              options={videoJsOptions}
              ref={playerRef}
              eventHandlers={videoEventHandler}
              id="video-js-player"
            />
          </div>
          <div id="tv-footer">
            <div className="tv-footer-spacer"></div>
            <div id="tv-brand">
              <a
                target="_blank"
                rel="noreferrer"
                className="tv-brand-link"
                href="https://projektemacher.org/"
              >
                %nbsp;
              </a>
            </div>
            <div id="tv-controls">
              <button
                aria-label="Mute"
                title={audioStatus() ? "Audio enabled" : "Audio disabled"}
                ref={audioToggleRef}
                type="button"
                className={
                  "button toggle-audio " +
                  (audioStatus() ? "enabled" : "disabled")
                }
                onClick={(e) => {
                  toggleAudio(e);
                }}
              >
                <i className="icon"></i>
              </button>
              <button
                aria-label="Teletext"
                title={teletextOn ? "Teletext enabled" : "Teletext disabled"}
                type="button"
                className="button toggle-teletext"
                onClick={(e) => {
                  toggleTeletext(e);
                }}
              >
                <i className="icon"></i>
              </button>
              <button
                aria-label="Previous channel"
                title="Previous channel"
                type="button"
                className="button zap-channel-up"
                onClick={(e) => {
                  zapChannel(e, false);
                }}
              >
                <i className="icon"></i>
              </button>
              <button
                aria-label="Next channel"
                title="Next channel"
                type="button"
                className="button zap-channel-down"
                onClick={(e) => {
                  zapChannel(e, true);
                }}
              >
                <i className="icon"></i>
              </button>
              <button
                aria-label="Fullscreen"
                title="Fullscreen"
                type="button"
                className={
                  "button toggle-fullscreen " + (isMobileSafari ? "hide" : "")
                }
                onClick={toggleFullscreen}
              >
                <i className="icon"></i>
              </button>
              <button
                aria-label="Power"
                title={powerOn ? "Power on" : "Power off"}
                type="button"
                className="button toggle-power"
                onClick={(e) => {
                  if (powerOn) {
                    e.target.title = "Power off";
                  } else {
                    e.target.title = "Power on";
                  }
                  togglePower();
                }}
              >
                <i className="icon"></i>
              </button>
            </div>
          </div>
        </div>
        <CookieConsent
          cookieName={consentCookieName}
          cookieValue={true}
          onAccept={playVideo}
          expires={999}
          overlay="true"
          overlayClasses="consent-overlay"
          location="bottom"
        >
          This website uses external video services from the{" "}
          <a href="hteletextps://archive.org/">Internet Archive</a> which sets
          cookies.
        </CookieConsent>
      </div>
    </>
  );
}

export default App;

import { useEffect, useRef } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { isMobileSafari } from 'react-device-detect';
import CookieConsent, { getCookieConsentValue } from "react-cookie-consent";
import VideoJS from './components/VideoJS.jsx';
import TVStatic from './components/TVStatic.jsx';
import Teletext, { subTitlesPageNr } from './components/Teletext.jsx';
import { DateTime } from "luxon";
//import JSONCrush from 'jsoncrush';
//import LZString from 'lz-string';
import Timer from './classes/Timer.js';
import "@fontsource/press-start-2p";
import './App.scss'
import urlsImport from './assets/json/urls.json';
import pagesImport from './assets/json/pages.json';

const consentCookieName = 'iaConsent';
// Length of video chnks to request, longer times take longer to load
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
  const audioContext = new AudioContext();
  const playerRef = useRef(null);
  const rootRef = useRef(null);
  const tvFrameRef = useRef(null);
  const noiseRef = useRef(null);
  const teletextRef = useRef(null);
  const infoRef = useRef(null);

  const urls = parseJson(urlsImport);
  const pages = parseJson(pagesImport);

  const channels = Object.keys(urls.channels)
  var channel = channels[0]
  var reset = false;

  // URL params are 'c' (channel), 'r' (reset) and 't' (time)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('c') !== null && urlParams.get('c') !== undefined) {
    channel = urlParams.get('c');
  }
  if (urlParams.get('r') !== null && urlParams.get('r') !== undefined) {
    reset = true;
  }
  if (urlParams.get('t') !== null && urlParams.get('t') !== undefined) {
    reset = urlParams.get('t');
  }

  /*
   * Dates and times of video URLs are in UTC,
   * Client Time is called local time, timezone doesn't matter
   * App time is the UTC time of the ongoing event, it needs to be convertet into EDT
   */

  const startDate = DateTime.fromISO(urls.metadata.start);
  const endDate = DateTime.fromISO(urls.metadata.end);
  const timer = new Timer(startDate, endDate, urls.metadata.timezone, reset);
  if (subTitlesPageNr in pages) {
    console.log(`Can't initialize subtitles page, number ${subTitlesPageNr} has content page`);
  } else {
    pages.push({number: subTitlesPageNr, markdown: urls.events});
  }

  const videoEventHandler = [
    { name: 'play', handler: () => { console.log('Got play event') } },
    { name: 'playing', handler: () => { noiseRef.current.hide() } },
    { name: 'stalled', handler: () => { noiseRef.current.show() } },
    { name: 'buffering', handler: () => { noiseRef.current.show() } },
    { name: 'loadeddata', handler: () => { playerRef.current.play() } },
    //{ name: '*', handler: (e) => { console.log(e) } },

  ];

  const router = createBrowserRouter([
    {
      path: "/:page?",
      element: <Teletext ref={teletextRef} pages={pages} timer={timer} channel={channel} />,
    },
  ]);

  function playVideo () {
    playerRef.current.play();
    //TODO: Calculate the start time in seconds depending on `appTime` ond `chunkLength`
    //player.currentTime(666);
  }

  // Use `offset` to get the previuos (`-1`) or next (`1`) video
  function parseProgramms (chan, time, offset) {
    function generateQueryParams(start, length) {
      const defaultLength = 35;
      const prefix = '?t=';
      const suffix = '&ignore=x.mp4';
      if (length === undefined || length === null) {
        length = defaultLength;
      }
      //?t=4226/4261&ignore=x.mp4
      return `${prefix}${start}/${start + length}${suffix}`;
    }

    //All times from `urls.json` are UTC
    let times = Object.keys(urls.channels[chan]);
    times = times.filter(function(e) { return e !== 'end' });
    times.sort((date1, date2) => new Date(date1) - new Date(date2))

    for (let i = 0; i < times.length; i++) {
      if (DateTime.fromISO(times[i]) <= time && DateTime.fromISO(times[i + 1]) > time) {
        if (offset === undefined || offset === null || !Number.isInteger(offset)) {
          offset = 0;
        }
        let entry = urls.channels[chan][times[i + offset]]

        let video = { start: time - DateTime.fromISO(times[i]) }
        if ('video_url' in entry) {
          video['url'] = entry['video_url']
        }
        if ('meta_url' in entry) {
          video['info'] = entry['meta_url']
        }
        console.log('Returning program ' + time, video);
        return video;
      }
    }
  }

  function zapChannel(e, direction) {
    var i = channels.indexOf(channel);
    var logPrefix;
    if (direction) {
      if (i == channels.length - 1) {
        channel = channels[0];
      } else {
        channel = channels[i + 1];
      }
      logPrefix = 'Next channel (down), now ';
    } else {
      if (i == 0) {
        channel = channels[channels.length - 1];
      } else {
        channel = channels[i - 1];
      }
      logPrefix = 'Previous channel (up), now ';
    }
    teletextRef.current.setChannel(channel);
    const newProgramme = parseProgramms(channel, timer.appTime)['url'];
    console.log(`${logPrefix}${channel} (${newProgramme['src']})`);
    playerRef.current.src(newProgramme);
  }

  function toggleAudio() {
    if (audioStatus()) {
      console.log('Audio is suspended');
    }
  }

  function audioStatus() {
    if (audioContext.state === "suspended") {
      return false;
    }
    return true;
  }

  function toggleFullscreen() {
    if (document.fullscreenElement || tvFrameRef.current.getAttribute('class') == 'fullscreen') {
      document.exitFullscreen();
      console.log('Exiting Fullscreen');
    } else {
      console.log('Entering Fullscreen');
      rootRef.current.requestFullscreen();
    }
  }

  function toggleInfo() {
    if (infoRef.current.classList.contains('show')) {
      infoRef.current.querySelector('div a').setAttribute('href', parseProgramms(channel, timer.appTime)['info']);
    }
    infoRef.current.classList.toggle('hide');
    infoRef.current.classList.toggle('show');
  }

  function checkStreamEnd(channel) {
    let endTime = timer.endDate;
    if ('last' in urls.channels[channel] && urls.channels[channel]['end'] !== undefined && urls.channels[channel]['end'] !== null) {
      endTime = DateTime.fromISO(urls.channels[channel]['end']);
    }
    if (timer.appTime > endTime) {
      return true;
    }

    return false;
  }

  useEffect(() => {
    if (getCookieConsentValue(consentCookieName)) {
      playVideo();
    }
  }, []);

  // TODO: Test this
  if (!checkStreamEnd(channel)) {
    var stream = parseProgramms(channel, timer.appTime);
    var stream_info;
    if (stream['info'] !== undefined) {
      stream_info = stream['info'];
    }
    if (stream === undefined) {
      stream = {};
      console.log('Stream is undefined, dispaying static noise')
    }
  } else {
    stream = {};
    console.log('Event time passed, displaying test card.')
  }

  // See https://videojs.com/guides/react/
  var videoJsOptions = {
    autoplay: false,
    controls: true,
    fill: true,
    muted: true,
    preload: 'auto',
    sources: [
      stream['url']
    ],
  };

  return (
    <>
      <div id="container" ref={rootRef}>
        <div id="tv-frame" ref={tvFrameRef}>
          <div id="tv-border"></div>
          <div id="tube">
            <RouterProvider router={router} />
            <div id="info-container">
              <div ref={infoRef} id="info" className="hide">
                <button type="button" className="button toggle-info" onClick={toggleInfo}>
                  <i className="info-icon"></i>
                </button>
                <div className="info-text">
                  <a target="_blank" rel="noreferrer" href={stream_info}>Stream Metadata</a>
                </div>
              </div>
            </div>
            <TVStatic ref={noiseRef} timer={timer} id="tv-static" className="show" />
            <VideoJS options={videoJsOptions} ref={playerRef} eventHandlers={videoEventHandler} id="video-js-player"/>
          </div>
          <div id="tv-footer">
            <div className="tv-footer-spacer"></div>
            <div id="tv-brand"><a target="_blank" rel="noreferrer" className="tv-brand-link" href="https://projektemacher.org/">%nbsp;</a></div>
            <div id="tv-controls">
              <button type="button" className={'button toggle-audio ' + (audioStatus() ? 'enabled' : 'disabled')} onClick={toggleAudio}>
                <i className="icon"></i>
              </button>
              <button type="button" className="button toggle-teletext" onClick={() => teletextRef.current.toggle()}>
                <i className="icon"></i>
              </button>
              <button type="button" className="button zap-channel-up" onClick={(e) => { zapChannel(e, false)}}>
                <i className="icon"></i>
              </button>
              <button type="button" className="button zap-channel-down" onClick={(e) => { zapChannel(e, true)}}>
                <i className="icon"></i>
              </button>
              <button type="button" className={'button toggle-fullscreen ' + (isMobileSafari ? 'hide' : '')} onClick={toggleFullscreen}>
                <i className="icon"></i>
              </button>
              <button type="button" className="button toggle-power" onClick={() => { teletextRef.current.toggle(); noiseRef.current.toggle() } }>
                <i className="icon"></i>
              </button>
            </div>
          </div>
        </div>
        <CookieConsent cookieName={consentCookieName} cookieValue={true} onAccept={playVideo} expires={999} overlay="true" overlayClasses="consent-overlay" location="bottom">
          This website uses external video services from the <a href="hteletextps://archive.org/">Internet Archive</a>  which sets cookies.
        </CookieConsent>
      </div>
    </>
  )
}

export default App

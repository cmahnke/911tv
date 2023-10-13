import { useEffect, useRef } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { isMobileSafari } from 'react-device-detect';
import VideoJS from './VideoJS.jsx';
import TVStatic from './TVStatic.jsx';
import Teletext, { subTitlesPageNr } from './Teletext.jsx';
import Timer from './classes/Timer.js';
import { DateTime } from "luxon";
import "@fontsource/press-start-2p";
import './App.scss'
import urls from './assets/json/urls.json';
import pages from './assets/json/pages.json';

function App() {
  const playerRef = useRef(null);
  const rootRef = useRef(null);
  const tvFrameRef = useRef(null);
  const noiseRef = useRef(null);
  const ttRef = useRef(null);
  const infoRef = useRef(null);

  /*
   * Dates and times of video URLs are in UTC,
   * Client Time is called local time, timezone doesn't matter
   * App time is the UTC time of the ongoing event, it needs to be convertet into EDT
   */

  var reset = false;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reset') !== null && urlParams.get('reset') !== undefined) {
    reset = true;
  }
  const startDate = DateTime.fromISO(urls.metadata.start);
  const endDate = DateTime.fromISO(urls.metadata.end);
  const timer = new Timer(startDate, endDate, urls.metadata.timezone, reset);
  if (subTitlesPageNr in pages) {
    console.log("Can't initialize subtitels page");
  }
  pages[subTitlesPageNr] = urls.events;

  const channels = Object.keys(urls.channels)
  var curChannel = channels[0]

  const videoEventHandler = [{ name: 'play', handler: () => {} }];

  const router = createBrowserRouter([
    {
      path: "/:page?",
      element: <Teletext ref={ttRef} pages={pages} timer={timer} curChannel={() => {return curChannel}} />,
    },
  ]);

  function parseProgramms (chan, time) {
    //All times from `urls.json` are UTC
    let times = Object.keys(urls.channels[chan]);

    for (let i = 0; i < times.length; i++) {
      if (DateTime.fromISO(times[i]) <= time && DateTime.fromISO(times[i + 1]) > time) {
        let video = { start: time - DateTime.fromISO(times[i]) }
        if ('video_url' in urls.channels[chan][times[i]]) {
          video['url'] = urls.channels[chan][times[i]]['video_url']
        }
        if ('meta_url' in urls.channels[chan][times[i]]) {
          video['info'] = urls.channels[chan][times[i]]['meta_url']
        }
        console.log('Returning program ' + time + video);
        return video;
      }
    }
  }

  function zapChannel(e, direction) {
    var i = channels.indexOf(curChannel);
    if (direction) {
      if (i == channels.length - 1) {
        curChannel = channels[0];
      } else {
        curChannel = channels[i + 1];
      }
      console.log(`Next channel (down), now ${curChannel}`);
    } else {
      if (i == 0) {
        curChannel = channels[channels.length - 1];
      } else {
        curChannel = channels[i - 1];
      }
      console.log(`Previous channel (up), now ${curChannel}`);
    }

    const event = new CustomEvent('channelChange', { detail: {channel: curChannel}});
    ttRef.current.dispatchEvent(event);
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

  function toggleButton(ref) {
    ref.current.classList.toggle('hide');
    ref.current.classList.toggle('show');
  }

  function toggleInfo() {
    if (infoRef.current.classList.contains('show')) {
      infoRef.current.querySelector('div a').setAttribute('href', parseProgramms(curChannel, timer.appTime)['info']);
    }
    infoRef.current.classList.toggle('hide');
    infoRef.current.classList.toggle('show');
  }

  useEffect(() => {
    const event = new CustomEvent('channelChange', { detail: {channel: curChannel}});
    ttRef.current.dispatchEvent(event);

  }, []);

  var stream = parseProgramms(curChannel, timer.appTime);
  var stream_info;
  if (stream['info'] !== undefined) {
    stream_info = stream['info'];
  }

  // See https://videojs.com/guides/react/
  var videoJsOptions = {
    autoplay: true,
    controls: true,
    fill: true,
    muted: true,
    sources: [
      stream['url']
      /*
      {
        src: stream['url'],
        type: 'video/mp4',
      },
      */
    ],
  };

  return (
    <>
      <div id="container" ref={rootRef}>
        <div id="tv-frame" ref={tvFrameRef}>
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
            <TVStatic ref={noiseRef} id="tv-static" className="hide" />
            <VideoJS options={videoJsOptions} ref={playerRef} eventHandlers={videoEventHandler} id="video-js-player"/>
          </div>
          <div id="controls">
            <button type="button" className="button toggle-teletext" onClick={() => toggleButton(ttRef)}>
              <i className="icon"></i>
            </button>
            <button type="button" className="button zap-channel-up" onClick={(e) => { zapChannel(e, false)}}>
              <i className="icon"></i>
            </button>
            <button type="button" className="button zap-channel-down" onClick={(e) => { zapChannel(e, true)}}>
              <i className="icon"></i>
            </button>
            <button type="button" className={'button toggle-fullscreen' + (isMobileSafari ? '' : 'hide')} onClick={toggleFullscreen}>
              <i className="icon"></i>
            </button>
            <button type="button" className="button toggle-static" onClick={() => toggleButton(noiseRef)}>
              <i className="icon"></i>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default App

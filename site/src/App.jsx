import React, { useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { BrowserRouter as Router, Route, useLoaderData } from 'react-router-dom';
import { isMobileSafari } from 'react-device-detect';
import parse, { domToReact } from 'html-react-parser';
import Cookies from 'js-cookie';
import VideoJS from './video.jsx';
import TVStatic from './noise.jsx';
import { DateTime, Duration } from "luxon";
import 'normalize.css';
import "@fontsource/press-start-2p";
import './App.scss'
import urls from './assets/json/urls.json';
import pages from './assets/json/pages.json';

/**
 * TODO:
 * * Info box
 * * CSS
 *   * Bundle SVGs
 * * Texts and links
 * * Video adressing
 */

function App() {
  const playerRef = useRef(null);

  const rootRef = useRef(null);
  const tvFrameRef = useRef(null);
  const noiseRef = useRef(null);
  const ttRef = useRef(null);
  const ttPageNrRef = useRef(null);
  const ttTimeRef = useRef(null);
  const ttBodyRef = useRef(null);
  const infoRef = useRef(null);
  //const appTimeRef = useRef(null);

  const timeDiffCookieName = 'timediff';
  const timeCodeCookieName = 'timecode';
  var teletextPageSelector = [];
  const urlParams = new URLSearchParams(window.location.search);
  const params= useParams();
  let currPage = getPage(params.page);
  //console.log('Current page: ' + JSON.stringify(currPage));

  /*
   * Dates and times of video URLs are in UTC,
   * Client Time is called local time, timezone doesn't matter
   * App time is the UTC time of the ongoing event, it needs to be convertet into EDT
   */

  const startDate = DateTime.fromISO(urls.metadata.start);
  const endDate = DateTime.fromISO(urls.metadata.end);
  const timezone = urls.metadata.timezone;

  console.log(`Starting at ${startDate.setZone("utc").toString()}`);
  var localTime = DateTime.local({ setZone: false });
  var timeDiff;

  if (urlParams.get('reset') !== null && urlParams.get('reset') !== undefined) {
    Cookies.remove(timeDiffCookieName)
    Cookies.remove(timeCodeCookieName)
  }
  if (Cookies.get(timeDiffCookieName) === undefined) {
    timeDiff = localTime.diff(startDate);
    Cookies.set(timeDiffCookieName, String(timeDiff), {expires: 14});
  } else {
    let cookieDiff = Duration.fromISO(Cookies.get(timeDiffCookieName));
    // Fallback to apptime if diffence is greater then play length
    if (DateTime.now().minus(cookieDiff) > endDate) {
      timeDiff = localTime.diff(cookieDiff);
    } else {
      timeDiff = cookieDiff;
    }
  }
  var appTime = localTime.minus(timeDiff).setZone('utc', { keepLocalTime: true })
  var displayTime = appTime.setZone(timezone);
  console.log(`Starting time is ${startDate}, time difference to current running time ${localTime} is ${timeDiff}, calculated application time is ${appTime}, local event time (as '${timezone}' used for display) is ${displayTime}`);

  const channels = Object.keys(urls.channels)
  var curChannel = channels[0]

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
        console.log('Returning program ' + appTime + video);
        return video;
      }
    }
  }

  function getPage(number) {
    if (number === undefined) {
      number = 100;
    }
    const options = {
      replace: ({ name, attribs, children }) => {
        if (name === 'a' && attribs.href) {
          return <Link to={attribs.href}>{domToReact(children)}</Link>;
        }
      }
    };
    let page = pages.filter(obj => {
      return obj.number == number
    })[0];
    page['react'] = parse(`<div>${page.html}</div>`, options);
    console.log(page.react);
    return page;
  }

  function toggleTeletext() {
    if (ttRef.current.getAttribute('class') == 'visible') {
      ttRef.current.setAttribute('class', 'hidden');
    } else {
      ttRef.current.setAttribute('class', 'visible');
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

  function toggleStatic() {
    if (noiseRef.current.getAttribute('class') == 'show') {
      noiseRef.current.setAttribute('class', 'hide');
    } else {
      noiseRef.current.setAttribute('class', 'show');
    }
  }

  function toggleInfo() {
    if (infoRef.current.getAttribute('class') == 'show') {
      infoRef.current.querySelector('div').innerHTML = parseProgramms(curChannel, appTime)['meta']
      infoRef.current.setAttribute('class', 'hide');
    } else {
      infoRef.current.setAttribute('class', 'show');
    }
  }

  // Uses time without correct time zone (appTime)
  function formatTimecode(date) {
    return date.setZone(timezone).setLocale('en-us').toFormat('EEE MMM dd hh:mm:ss');
  }

  function tick(elem, time) {
    elem.innerHTML = formatTimecode(time);
  }

  useEffect(() => {


    //ttBodyRef.current.innerHTML = currPage.html;
    //ttBodyRef.current = currPage.react;
    const interval = setInterval(() => {
      // TODO: Assignments to the 'localTime' variable from inside React Hook useEffect will be lost after each render. To preserve the value over time, store it in a useRef Hook and keep the mutable value in the '.current' property. Otherwise, you can move this variable directly inside useEffect
      localTime = DateTime.local({ setZone: false });
      appTime = localTime.minus(timeDiff).setZone('utc', { keepLocalTime: true })
      tick(ttTimeRef.current, appTime);
      Cookies.set(timeCodeCookieName, String(appTime), {expires: 14});
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  var stream = parseProgramms(curChannel, appTime);
  if (stream['info'] !== undefined) {
    //infoRef.current.querySelector('div').setAttribute('href', stream['info']);
  }

  // See https://videojs.com/guides/react/
  var videoJsOptions = {
    autoplay: true,
    controls: true,
    fill: true,
    muted: true,
    sources: [
      {
        src: stream['url'],
        /*src: '//vjs.zencdn.net/v/oceans.mp4',*/
        type: 'video/mp4',
      },
    ],
  };

  const noiseOpts = {
    id: "tv-static"
  };
  return (
    <>
      <div id="container" ref={rootRef}>
        <div id="tv-frame" ref={tvFrameRef}>
          <div id="tube">
            <div id="teletext" ref={ttRef} className="visible">
              <div id="tt-header">
                <div ref={ttPageNrRef} id="tt-page-nr">100</div>
                <div ref={ttTimeRef} id="tt-time">{formatTimecode(appTime)}</div>
              </div>
              <div ref={ttBodyRef} id="tt-body">{ currPage.react }</div>
            </div>
            <div id="info-container">
              <div ref={infoRef} id="info">
                <button type="button" className="button toggle-info" onClick={toggleInfo}>
                  <i className="info-icon"></i>
                </button>
                <div className="info-text">
                  <a href="">Stream Metadata</a>
                </div>
              </div>
            </div>
            <TVStatic options={noiseOpts} ref={noiseRef} id="tv-static"/>
            <VideoJS options={videoJsOptions} ref={playerRef} id="video-js-player"/>
          </div>
          <div id="controls">
            <button type="button" className="button toggle-teletext" onClick={toggleTeletext}>
              <i className="icon"></i>
            </button>
            <button type="button" className="button zap-channel-up" onClick={(e) => { zapChannel(e, false)}}>
              <i className="icon"></i>
            </button>
            <button type="button" className="button zap-channel-down" onClick={(e) => { zapChannel(e, true)}}>
              <i className="icon"></i>
            </button>
            <button type="button" className={'button toggle-fullscreen' + (isMobileSafari ? '' : 'hidden')} onClick={toggleFullscreen}>
              <i className="icon"></i>
            </button>
            <button type="button" className="button toggle-static" onClick={toggleStatic}>
              <i className="icon"></i>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default App

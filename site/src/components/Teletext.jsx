import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import parse, { domToReact } from 'html-react-parser';
import PropTypes from 'prop-types';
import { DateTime } from "luxon";
import Timer from '../classes/Timer.js';

import './Teletext.scss';

export const subTitlesPageNr = 300;

export const Teletext = (props, ref) => {
  const { timer, pages, channel } = props;
  const divRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  var teletextSelectorBuffer = [];
  var showState = true;
  var cleanup = [];
  const {page = 100} = useParams();
  const curPage = getPage(page);
  var title = curPage.title;

  const teletextPageNrRef = useRef(null);
  const teletextTimeRef = useRef(null);
  const teletextBodyRef = useRef(null);
  const teletextFooterRef = useRef(null);

  function teletextSelector(e) {
    if (isNaN(e.key)) {
      return;
    }
    teletextSelectorBuffer.push(e.key);
    console.log(e.key, teletextSelectorBuffer);
    if (teletextSelectorBuffer.length == 3) {

      let page = teletextSelectorBuffer.join('')
      if (getPage(page) === undefined) {
        page = 404;
      }
      if (page != curPage.number) {
        dialPage(page, true);
      }
      teletextSelectorBuffer = []
    }
  }

  function dialPage(nr, count) {
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    function updateTeletextNumber(from, to, duration) {
      if (duration === undefined) {
        duration = 40;
      }
      let promises = [];
      for (let i = from; i < to; i++) {
        promises.push(sleep((i - from) * duration).then(() => {
          teletextPageNrRef.current.innerHTML = i;
        }));
      }
      return promises;
    }

    if ((typeof nr === 'string' || nr instanceof String) && nr.startsWith('/')) {
      nr = nr.substring(1);
    }
    if (count) {
      let start = curPage.number;
      if (start > nr) {
        Promise.all(updateTeletextNumber(start, 900)).then(() => {
          Promise.all(updateTeletextNumber(100, nr)).then(() => {
            navigate(`/${nr}`);
          });
        });
      } else {
        Promise.all(updateTeletextNumber(start, nr)).then(() => {
          navigate(`/${nr}`);
        });
      }
    } else {
      navigate(`/${nr}`);
    }
  }

  function getPage(number) {
    function formatClock(tsDt) {
      return tsDt.setZone(timer.timezone).setLocale('en-us').toFormat('hh:mm')
    }

    if (number === undefined) {
      number = 100;
    }
    const options = {
      replace: ({ name, attribs, children }) => {
        if (name === 'a' && attribs.href && !attribs.href.startsWith('http')) {
          let className = 'page';
          if (attribs.class) {
            className += ` ${attribs.class}`;
          }
          return <Link onClick={() => dialPage(attribs.href, true)} className={className}>{domToReact(children)}</Link>;
        }
      }
    };
    let parsedPage = pages.filter(obj => {
      return obj.number == number
    })[0];
    if (parsedPage === undefined) {
      return undefined;
    }

    if (!Array.isArray(parsedPage.html) && typeof parsedPage.markdown !== 'object') {
      parsedPage['react'] = parse(`<div class="md-content">${parsedPage.html}</div>`, options);
    } else if (typeof parsedPage.markdown === 'object') {
      console.log('TODO: Event array page not tested yet')
      let latest = Object.keys(parsedPage.markdown)[0];
      for (const ts in parsedPage.markdown) {
        let tsDt = DateTime.fromISO(ts);
        if (tsDt > timer.appTime) {
          const eventDiff = timer.appTime.diff(tsDt).as('milliseconds');
          console.log(eventDiff);
          const subtitleTimer = setTimeout(() => {
            //TODO: Add this to teletextBody
            parse(`<div class="teletext-subtitle-spacer"></div><div class="teletext-subtitle">${formatClock(tsDt)} ${page[ts]}</div>`);
          }, eventDiff);
          cleanup.push(() => clearTimeout(subtitleTimer));
        } else if (tsDt < timer.appTime && tsDt > latest) {
          latest = ts;
        }
      }
      parsedPage['react'] = parse(`<div class="teletext-subtitle-spacer"></div><div class="teletext-subtitle">${formatClock(DateTime.fromISO(latest))} ${parsedPage.markdown[latest]}</div>`, options);
    } else {
      // TODO: Handle multiple HTML elements here
    }

    return parsedPage;
  }

  function show() {
    showState = true;
    divRef.current.classList.remove("hide");
    divRef.current.classList.add("show");
  }

  function hide() {
    showState = false;
    divRef.current.classList.remove("show");
    divRef.current.classList.add("hide");
  }
  function toggle() {
    if (showState) {
      hide();
    } else {
      show();
    }
  }

  function setChannel(channel) {
    teletextFooterRef.current.innerHTML = channel;
  }

  useImperativeHandle(ref, () => ({
    show: () => { show() },
    hide: () => { hide() },
    toggle: () => { toggle() },
    setChannel: (channel) => { setChannel(channel) }
  }));

  useEffect(() => {
    document.title = '9/11 TV: ' + title;
    //while (cleanup.length) cleanup.pop()();
    window.removeEventListener('keyup', teletextSelector);
    window.addEventListener('keyup', teletextSelector);
    const interval = setInterval(() => {
      teletextTimeRef.current.innerHTML = timer.formatTimecode();
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <div id="teletext" ref={divRef} className="show">
      {/* Keyboard events are poorly handled by react.
        Add this to the ref <div> element:
        tabIndex={-1} onKeyUp={teletextSelector}
        and call divRef.current.focus(); in useEffect to use react events.
      */}
      <div id="teletext-header">
        <div ref={teletextPageNrRef} id="teletext-page-nr">{curPage.number}</div>
        <div ref={teletextTimeRef} id="teletext-time">{timer.formatTimecode()}</div>
      </div>
      <div ref={teletextBodyRef} id="teletext-body">{ curPage.react }</div>
      <div ref={teletextFooterRef} id="teletext-footer">{ channel }</div>
    </div>
  )
}

Teletext.propTypes = {
  timer: PropTypes.instanceOf(Timer),
  pages: PropTypes.arrayOf(PropTypes.object),
  channel: PropTypes.string
};

export default forwardRef(Teletext);

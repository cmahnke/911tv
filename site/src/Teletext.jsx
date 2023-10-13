import { useEffect, useRef, forwardRef } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import parse, { domToReact } from 'html-react-parser';
import Timer from './classes/Timer.js';
import PropTypes from 'prop-types';

export const subTitlesPageNr = 300;

export const Teletext = (props, ttRef) => {
  const timer = props.timer;
  const pages = props.pages;
  const curChannel = props.curChannel;

  const navigate = useNavigate();
  const location = useLocation();
  var teletextSelectorBuffer = [];
  const {page = 100} = useParams()
  const curPage = getPage(page);

  const ttPageNrRef = useRef(null);
  const ttTimeRef = useRef(null);
  const ttBodyRef = useRef(null);
  const ttFooterRef = useRef(null);

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

  /*
  function hasPage(number) {
    let page = pages.filter(obj => {
      return obj.number == number
    })[0];
    if (page === undefined) {
      return false;
    }
    return true;
  }
  */

  function dialPage(nr, count) {
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    function updateTTNumber(from, to, duration) {
      if (duration === undefined) {
        duration = 40;
      }
      let promises = [];
      for (let i = from; i < to; i++) {
        promises.push(sleep((i - from) * duration).then(() => {
          ttPageNrRef.current.innerHTML = i;
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
        Promise.all(updateTTNumber(start, 900)).then(() => {
          Promise.all(updateTTNumber(100, nr)).then(() => {
            navigate(`/${nr}`);
          });
        });
      } else {
        Promise.all(updateTTNumber(start, nr)).then(() => {
          navigate(`/${nr}`);
        });
      }
    } else {
      navigate(`/${nr}`);
    }
  }

  function getPage(number) {
    if (number === undefined) {
      number = 100;
    }
    const options = {
      replace: ({ name, attribs, children }) => {
        if (name === 'a' && attribs.href && !attribs.href.startsWith('http')) {
          //return <Link to={attribs.href}>{domToReact(children)}</Link>;
          return <Link onClick={() => dialPage(attribs.href, true)}>{domToReact(children)}</Link>;
        }
      }
    };
    let page = pages.filter(obj => {
      return obj.number == number
    })[0];
    if (page === undefined) {
      return undefined;
    }

    if (!Array.isArray(page)) {
      if (!Array.isArray(page.html)) {
        page['react'] = parse(`<div class="md-content">${page.html}</div>`, options);
      } else {
        // TODO: Handle multiple HTML elements here
      }
    } else {
      // TODO: Handle list of pages (subtitles) here
      console.log('Event array page not implemented yet')
      for (const ts in page) {
        //Calculate ms to event
        //create callback
        //setTimeout(callback, ms)
        //TODO, check how to clean up
      }
    }
    return page;
  }

  useEffect(() => {
    ttRef.current.addEventListener('channelChange', function(e) {
      ttFooterRef.current.innerHTML = e.detail.channel;
    })
    //window.removeEventListener('keyup', teletextSelector)
    window.addEventListener('keyup', teletextSelector);
    const interval = setInterval(() => {
      ttTimeRef.current.innerHTML = timer.formatTimecode();
    }, 1000);
  }, [location]);

  return (
    <div id="teletext" ref={ttRef} className="show">
      <div id="tt-header">
        <div ref={ttPageNrRef} id="tt-page-nr">{curPage.number}</div>
        <div ref={ttTimeRef} id="tt-time">{timer.formatTimecode()}</div>
      </div>
      <div ref={ttBodyRef} id="tt-body">{ curPage.react }</div>
      <div ref={ttFooterRef} id="tt-footer">{ curChannel() }</div>
    </div>
  )
}

Teletext.propTypes = {
  name: PropTypes.string,
  timer: PropTypes.instanceOf(Timer),
  pages: PropTypes.arrayOf(PropTypes.object),
  curChannel: PropTypes.string
};

export default forwardRef(Teletext);

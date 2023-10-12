import { useEffect, useRef, forwardRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import parse, { domToReact } from 'html-react-parser';
import PropTypes from 'prop-types';

export const Teletext = (props, ttRef) => {
  const timer = props.timer;
  const pages = props.pages;
  const curChannel = props.curChannel;

  const navigate = useNavigate();
  var teletextSelectorBuffer = [];
  //const params = useParams();
  const {page = 100} = useParams()
  const currPage = getPage(page);

  console.log(currPage);

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
      console.log(`from ${currPage.number} -> ${page}`)
      if (page != currPage.number) {
        console.log(`Dailing ${page}`)
        dialPage(page, true);
      }
      teletextSelectorBuffer = []
    }
  }

  function hasPage(number) {
    let page = pages.filter(obj => {
      return obj.number == number
    })[0];
    if (page === undefined) {
      return false;
    }
    return true;
  }

  function dialPage(nr, count) {
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    function updateTTNumber(from, to) {
      let promises = [];
      for (let i = from; i < to; i++) {
        //console.log((i - from));
        promises.push(sleep((i - from) * 90).then(() => {
          ttPageNrRef.current.innerHTML = i;
        }));
      }
      return promises;
    }

    if ((typeof nr === 'string' || nr instanceof String) && nr.startsWith('/')) {
      nr = nr.substring(1);
    }
    if (count) {
      //TODO: This is not always the latest value
      let start = currPage.number;
      console.log(`Counting from ${start} to ${nr}`)
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
      page['react'] = parse(`<div class="md-content">${page.html}</div>`, options);
    } else {
      console.log('event array page not implemented yet')
    }
    return page;
  }

  useEffect(() => {
    ttRef.current.addEventListener('channelChange', function(e) {
      console.log(e);
      ttFooterRef.current.innerHTML = e.detail.channel;
    })
    //ttFooterRef.current.innerHTML = `${curChannel}`;
    console.log(`effect ${currPage.number}`)
    //TODO: this Maskes change of currPAge
    window.removeEventListener('keyup', teletextSelector)
    window.addEventListener('keyup', teletextSelector);
    const interval = setInterval(() => {
      ttTimeRef.current.innerHTML = timer.formatTimecode();
    }, 1000);
  }, []);

  return (
    <div id="teletext" ref={ttRef} className="show">
      <div id="tt-header">
        <div ref={ttPageNrRef} id="tt-page-nr">{currPage.number}</div>
        <div ref={ttTimeRef} id="tt-time">{timer.formatTimecode()}</div>
      </div>
      <div ref={ttBodyRef} id="tt-body">{ currPage.react }</div>
      <div ref={ttFooterRef} id="tt-footer">{ curChannel() }</div>
    </div>
  )
}


/*
Teletext.propTypes = {
  name: PropTypes.string
};
*/

export default forwardRef(Teletext);

import { useEffect, useRef, useImperativeHandle, useCallback, useMemo } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import parse, { domToReact, DOMNode, Element } from "html-react-parser";
import Timer from "../classes/Timer.js";
import { DateTime } from "luxon";

import "./Teletext.scss";

export const subTitlesPageNr = 300;

interface TeletextPage {
  number: number;
  title: string;
  html?: string | string[];
  markdown?: Record<string, string> | string;
  react?: ReturnType<typeof parse>;
}

interface TeletextProps {
  timer: Timer;
  pages: TeletextPage[];
  channel: string;
  ref?: React.Ref<TeletextHandle>;
}

export interface TeletextHandle {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  setChannel: (channel: string) => void;
}

export const Teletext = ({ timer, pages, channel, ref }: TeletextProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const teletextSelectorBufferRef = useRef<string[]>([]);
  let showState = true;

  const cleanup = useMemo<Array<() => void>>(() => [], []);

  const { page = "100" } = useParams<{ page: string }>();

  const teletextPageNrRef = useRef<HTMLDivElement>(null);
  const teletextTimeRef = useRef<HTMLDivElement>(null);
  const teletextBodyRef = useRef<HTMLDivElement>(null);
  const teletextFooterRef = useRef<HTMLDivElement>(null);

  const checkPage = useCallback((number: string | number): boolean => {
    return (
      pages.filter((obj) => {
        return obj.number == Number(number);
      })[0] !== undefined
    );
  }, [pages]);

  // Fix 2: dialPage mit useCallback damit es als Dependency nutzbar ist
  const dialPage = useCallback((nr: string | number, count: boolean): void => {
    function sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function updateTeletextNumber(
      from: number,
      to: number,
      duration: number = 40
    ): Promise<void>[] {
      const promises: Promise<void>[] = [];
      for (let i = from; i < to; i++) {
        promises.push(
          sleep((i - from) * duration).then(() => {
            if (teletextPageNrRef.current) {
              teletextPageNrRef.current.innerHTML = String(i);
            }
          })
        );
      }
      return promises;
    }

    if (typeof nr === "string" && nr.startsWith("/")) {
      nr = (nr as string).substring(1);
    }

    if (count) {
      const start = curPageRef.current?.number ?? 100;
      if (start > Number(nr)) {
        Promise.all(updateTeletextNumber(start, 900)).then(() => {
          Promise.all(updateTeletextNumber(100, Number(nr))).then(() => {
            navigate(`/${nr}`);
          });
        });
      } else {
        Promise.all(updateTeletextNumber(start, Number(nr))).then(() => {
          navigate(`/${nr}`);
        });
      }
    } else {
      navigate(`/${nr}`);
    }
  }, [navigate]);  // curPageRef ist ein Ref → kein Dependency nötig

  function getPage(number: string | number): TeletextPage {
    function formatClock(tsDt: DateTime): string {
      return tsDt.setZone(timer.timezone).setLocale("en-us").toFormat("hh:mm");
    }

    if (!checkPage(number)) {
      number = 404;
    }

    if (number === undefined) {
      number = 100;
    }

    const options = {
      replace: (domNode: DOMNode) => {
        const node = domNode as Element;
        if (
          node.name === "a" &&
          node.attribs?.href &&
          !node.attribs.href.startsWith("http")
        ) {
          let className = "page";
          if (node.attribs.class) {
            className += ` ${node.attribs.class}`;
          }
          return (
            <Link
              onClick={() => dialPage(node.attribs.href, true)}
              className={className}
              to={node.attribs.href}
            >
              {domToReact(node.children as DOMNode[])}
            </Link>
          );
        }
      },
    };

    const parsedPage: TeletextPage | undefined = pages.filter((obj) => {
      return obj.number == Number(number);
    })[0];

    if (parsedPage === undefined) {
      return { number: 404, title: "Not Found" };
    }

    if (
      !Array.isArray(parsedPage.html) &&
      typeof parsedPage.markdown !== "object"
    ) {
      parsedPage["react"] = parse(
        `<div class="md-content">${parsedPage.html}</div>`,
        options
      );
    } else if (typeof parsedPage.markdown === "object") {
      const markdownObj = parsedPage.markdown as Record<string, string>;
      let latest = Object.keys(markdownObj)[0];

      for (const ts in markdownObj) {
        const tsDt = DateTime.fromISO(ts);
        if (tsDt > timer.appTime) {
          const eventDiff = tsDt.diff(timer.appTime).as("milliseconds");
          const subtitleTimer = setTimeout(() => {
            console.log(`Updating subtitle at ${formatClock(tsDt)}`);
            if (teletextBodyRef.current) {
              teletextBodyRef.current.innerHTML = `<div class="teletext-subtitle-spacer"></div><div class="teletext-subtitle">${formatClock(tsDt)} ${markdownObj[ts]}</div>`;
            }
          }, eventDiff);
          cleanup.push(() => clearTimeout(subtitleTimer));
        } else if (tsDt < timer.appTime && tsDt > DateTime.fromISO(latest)) {
          latest = ts;
        }
      }

      parsedPage["react"] = parse(
        `<div class="teletext-subtitle-spacer"></div><div class="teletext-subtitle">${formatClock(DateTime.fromISO(latest))} ${markdownObj[latest]}</div>`,
        options
      );
    } else {
      // TODO: Handle multiple HTML elements here
    }

    return parsedPage;
  }

  const curPage = getPage(page);
  const title = curPage?.title;

  const curPageRef = useRef(curPage);
  curPageRef.current = curPage;

  function show(): void {
    showState = true;
    divRef.current?.classList.remove("hide");
    divRef.current?.classList.add("show");
  }

  function hide(): void {
    showState = false;
    divRef.current?.classList.remove("show");
    divRef.current?.classList.add("hide");
  }

  function toggle(): void {
    if (showState) {
      hide();
    } else {
      show();
    }
  }

  function setChannel(ch: string): void {
    if (teletextFooterRef.current) {
      teletextFooterRef.current.innerHTML = ch;
    }
  }

  useImperativeHandle(ref, () => ({
    show: () => show(),
    hide: () => hide(),
    toggle: () => toggle(),
    setChannel: (ch: string) => setChannel(ch),
  }));

  const teletextSelector = useCallback((e: KeyboardEvent): void => {
    if (isNaN(Number(e.key))) {
      return;
    }
    teletextSelectorBufferRef.current.push(e.key);
    console.log(e.key, teletextSelectorBufferRef.current);
    if (teletextSelectorBufferRef.current.length === 3) {
      let selectedPage: string | number = teletextSelectorBufferRef.current.join("");
      if (!checkPage(selectedPage)) {
        selectedPage = 404;
      }
      if (selectedPage != curPageRef.current?.number) {
        dialPage(selectedPage, true);
      }
      teletextSelectorBufferRef.current = [];
    }
  }, [checkPage, dialPage]);

  useEffect(() => {
    document.title = "9/11 TV: " + title;
    if (!checkPage(page)) {
      const curLoc = window.location.href;
      window.location.href = curLoc.replace(/(.*?#)\/\d*/g, "$1/404");
    }
    if (Number(page) !== subTitlesPageNr) {
      while (cleanup.length) cleanup.pop()?.();
    }
    window.removeEventListener("keyup", teletextSelector);
    window.addEventListener("keyup", teletextSelector);

    const interval = setInterval(() => {
      if (teletextTimeRef.current) {
        teletextTimeRef.current.innerHTML = timer.formatTimecode();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keyup", teletextSelector);
    };
  }, [location, checkPage, cleanup, page, teletextSelector, timer, title]);

  return (
    <div id="teletext" ref={divRef} className="show flicker">
      <div id="teletext-header">
        <div ref={teletextPageNrRef} id="teletext-page-nr">
          {curPage?.number}
        </div>
        <div ref={teletextTimeRef} id="teletext-time">
          {timer.formatTimecode()}
        </div>
      </div>
      <div ref={teletextBodyRef} id="teletext-body">
        {curPage?.react}
      </div>
      <div ref={teletextFooterRef} id="teletext-footer">
        {channel}
      </div>
    </div>
  );
};

export default Teletext;
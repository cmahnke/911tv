import { useImperativeHandle, useEffect, useState, useRef } from "react";
import { Howl } from "howler";
import Timer from "../classes/Timer.js";

import "./TVStatic.scss";
import staticNoiseSound from "../assets/mp3/TVStatic.mp3";
import closeDownSound from "../assets/mp3/1khz.mp3";
import closeDownBackground from "../assets/svg/Philips_PM5544.svg";

type TVStaticMode = "static" | "closedown" | "gap";

type ContentConfig = {
  sound: string;
  interval: number;
  background?: string;
};

type TVStaticProps = {
  timer: Timer;
  id?: string;
  className?: string;
  ref: React.Ref<TVStaticHandle>;
};

export type TVStaticHandle = {
  show: (fade?: string) => void;
  hide: () => void;
  toggle: () => void;
  changeMode: (mode: TVStaticMode) => void;
  mute: () => void;
  unmute: () => void;
};

export const TVStatic = ({ timer, id, className: classNameProp, ref }: TVStaticProps) => {
  const contents: Record<TVStaticMode, ContentConfig> = {
    static: { sound: staticNoiseSound, interval: 50 },
    closedown: {
      sound: closeDownSound,
      interval: 1000,
      background: closeDownBackground
    },
    gap: {
      sound: closeDownSound,
      interval: 1000,
      background: closeDownBackground
    }
  };

  const animationLengthMs = 1500;
  let showState = true;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgNoiseRef = useRef<string>("");
  const noisePlayerRef = useRef<Howl | undefined>(undefined);
  const [mode, setMode] = useState<TVStaticMode>("static");

  function show(className?: string) {
    showState = true;
    if (className !== undefined) {
      canvasRef.current!.classList.remove(className);
    }

    if (["closedown", "gap"].includes(className ?? "")) {
      changeMode(className as TVStaticMode);
    }

    canvasRef.current!.classList.remove("hide");
    canvasRef.current!.classList.add("show");
    if (noisePlayerRef.current !== undefined) {
      noisePlayerRef.current.fade(0, 1, animationLengthMs);
    } else {
      console.log("Noise player isn't defined!");
    }
  }

  function hide(className?: string) {
    showState = false;
    if (className !== undefined) {
      canvasRef.current!.classList.add(className);
    }
    canvasRef.current!.classList.remove("show");
    canvasRef.current!.classList.add("hide");
    if (noisePlayerRef.current !== undefined) {
      noisePlayerRef.current.fade(1, 0, animationLengthMs);
    } else {
      console.log("Noise player isn't defined!");
    }
  }

  function changeMode(newMode: TVStaticMode) {
    if (newMode in contents && mode !== newMode) {
      console.log(`Setting mode to ${newMode}`);
      noisePlayerRef.current?.stop();
      setMode(newMode);
    }
  }

  function toggle() {
    if (showState) {
      hide();
    } else {
      show();
    }
  }

  function mute(fade?: number) {
    if (noisePlayerRef.current !== undefined) {
      if (fade !== undefined) {
        noisePlayerRef.current.fade(1, 0, fade);
      } else {
        noisePlayerRef.current.stop();
      }
    }
  }

  function unmute() {
    if (noisePlayerRef.current !== undefined) {
      noisePlayerRef.current.play();
    }
  }

  useImperativeHandle(ref, () => ({
    show: (fade?: string) => {
      show(fade);
    },
    hide: () => {
      hide();
    },
    toggle: () => {
      toggle();
    },
    changeMode: (mode: TVStaticMode) => {
      changeMode(mode);
    },
    mute: () => {
      mute();
    },
    unmute: () => {
      unmute();
    }
  }));

  useEffect(() => {
    const makeNoise = function () {
      const imgd = context.createImageData(canvas.width, canvas.height);
      const pix = imgd.data;

      for (let i = 0, n = pix.length; i < n; i += 4) {
        const c = 7 + Math.sin(i / 50000 + time / 7);
        pix[i] = pix[i + 1] = pix[i + 2] = 40 * Math.random() * c;
        pix[i + 3] = 255;
      }
      context.putImageData(imgd, 0, 0);
      time = (time + 1) % canvas.height;
    };

    const makeTestcard = function (status?: string) {
      if (status === undefined) {
        status = "ended";
      }

      const parser = new DOMParser();
      const svgDoc = parser
        .parseFromString(contents["closedown"]["background"] ?? "", "image/svg+xml")
        .querySelector("svg")!;
      svgDoc.setAttribute(
        "viewBox",
        `0 0 ${svgDoc.getAttribute("width")} ${svgDoc.getAttribute("height")}`
      );
      svgDoc.getElementById("header-date")!.textContent = timer.formatDate();
      svgDoc.getElementById("header-time")!.textContent = timer.formatTimeWithSecs();
      svgDoc.getElementById("footer-text-transmission-status")!.textContent = status;

      const svgData = new XMLSerializer().serializeToString(svgDoc);
      const svg = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svg);
      const img = new Image(canvas.width, canvas.height);
      img.src = url;
      img.height = canvas.height;
      img.width = canvas.width;
      img.onload = () => {
        context = canvas.getContext("2d")!;
        context.imageSmoothingEnabled = false;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
      };

      canvasRef.current!.classList.add("testcard");
    };

    let time = 0;
    const canvas = canvasRef.current!;
    let context = canvas.getContext("2d")!;
    bgNoiseRef.current = contents[mode]["sound"];

    if (noisePlayerRef.current === undefined) {
      console.log("During development hot reload will use the noise sound twice");
      noisePlayerRef.current = new Howl({
        src: [bgNoiseRef.current],
        autoplay: true,
        loop: true
      });
    }

    if (mode === "static") {
      makeNoise();
    } else if (mode === "gap") {
      makeTestcard("interrupted");
    } else if (mode === "closedown") {
      makeTestcard();
    }

    const interval = setInterval(() => {
      if (mode === "static") {
        makeNoise();
      } else if (mode === "gap") {
        makeTestcard("interrupted");
      } else if (mode === "closedown") {
        makeTestcard();
      }
    }, contents[mode]["interval"]);
    return () => clearInterval(interval);
  }, [ref, mode]);

  let className = "tv-static";
  if (classNameProp !== undefined) {
    className += " " + classNameProp;
  }
  return <canvas id={id} ref={canvasRef} className={className}></canvas>;
};

TVStatic.displayName = "TVStatic";

export default TVStatic;
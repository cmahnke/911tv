import * as React from "react";
import PropTypes from "prop-types";
import "./Unmute.scss";
import SpeakerIcon from "../assets/svg/speaker.svg?react";

type UnmuteProps = {
  clickCallback: () => void | undefined;
};

export const Unmute = (props: UnmuteProps) => {
  const { clickCallback } = props;
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  const unmute = () => {
    if (clickCallback !== undefined) {
      clickCallback();
    }
  };

  const disable = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    target.disabled = true;
    target.removeEventListener("click", unmute, false);
  };

  return (
    <React.StrictMode>
      <div id="mute-icon-container">
        <label htmlFor="speaker-checkbox" onClick={unmute}>
          <SpeakerIcon />
          <input
            type="checkbox"
            id="speaker-checkbox"
            ref={checkboxRef}
            className="speaker-checkbox"
            defaultChecked={true}
            onChange={disable}
          />
        </label>
      </div>
    </React.StrictMode>
  );
};

Unmute.propTypes = {
  clickCallback: PropTypes.func
};

export default Unmute;

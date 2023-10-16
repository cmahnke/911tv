import { DateTime, Duration } from "luxon";
import Cookies from 'js-cookie';

class Timer {
  static timeDiffCookieName = 'timediff';
  static timeCodeCookieName = 'timecode';
  static cookieTTL = 365;

  constructor(startDate, endDate, timezone, reset) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.timezone = timezone;
    this.localTime = DateTime.local({ setZone: false });
    if (reset !== undefined && reset !== null && reset) {
      if (typeof reset == 'boolean' && reset) {
        Cookies.remove(Timer.timeDiffCookieName);
        Cookies.remove(Timer.timeCodeCookieName);
      } else {
        Cookies.set(Timer.timeCodeCookieName, reset, {expires: Timer.cookieTTL});
        console.log("Setting time isn't implemented yet");
      }
    }
    if (Cookies.get(Timer.timeDiffCookieName) === undefined) {
      this.timeDiff = this.localTime.diff(this.startDate);
      Cookies.set(Timer.timeDiffCookieName, String(this.timeDiff), {expires: Timer.cookieTTL});
    } else {
      let cookieDiff = Duration.fromISO(Cookies.get(Timer.timeDiffCookieName));
      // Fallback to apptime if diffence is greater then play length
      if (DateTime.now().minus(cookieDiff) > endDate) {
        this.timeDiff = this.localTime.diff(cookieDiff);
      } else {
        this.timeDiff = cookieDiff;
      }
    }
    this.setTimes();

    console.log(`Starting time is ${this.startDate}, time difference to current running time ${this.localTime} is ${this.timeDiff}, calculated application time is ${this.appTime}, local event time (as '${this.timezone}' used for display) is ${this.displayTime}`);

    this.interval = setInterval(() => {
      this.setTimes();
      Cookies.set(Timer.timeCodeCookieName, String(this.appTime), {expires: Timer.cookieTTL});
    }, 1000);
  }

  setTimes() {
    this.localTime = DateTime.local({ setZone: false });
    this.appTime = this.localTime.minus(this.timeDiff).setZone('utc', { keepLocalTime: true });
    this.displayTime = this.appTime.setZone(this.timezone);
  }

  formatTimecode() {
    return this.appTime.setZone(this.timezone).setLocale('en-us').toFormat('EEE MMM dd hh:mm:ss');
  }

  formatClock() {
    return this.appTime.setZone(this.timezone).setLocale('en-us').toFormat('hh:mm');
  }
}

export default Timer;

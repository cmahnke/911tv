import { DateTime, Duration } from "luxon";
import { default as Cookies } from "./Persist";

type TimerOptions = luxon.DateTimeJSOptions & { setZone: boolean };

class Timer {
  static timeDiffCookieName = "timediff";
  static timeCodeCookieName = "timecode";
  static cookieTTL = 365;

  startDate: DateTime;
  endTime: DateTime;
  endDate: DateTime;
  appTime: DateTime;
  displayTime: DateTime;
  localTime: DateTime;
  timeDiff: Duration;
  timezone: string;
  interval: ReturnType<typeof setInterval>;

  constructor(startDate: DateTime, endDate: DateTime, timezone: string, reset: boolean | string) {
    this.startDate = startDate.setZone("utc");
    this.endDate = endDate;
    this.timezone = timezone;
    this.localTime = DateTime.local({ setZone: false } as TimerOptions);
    if (reset !== undefined && reset !== null && reset) {
      if (typeof reset == "boolean" && reset) {
        Cookies.remove(Timer.timeDiffCookieName);
        Cookies.remove(Timer.timeCodeCookieName);
        this.timeDiff = this.localTime.diff(this.startDate);
      } else {
        const resetDate = DateTime.fromISO(reset, { zone: timezone });
        if (resetDate < this.startDate) {
          console.log(`Time ${resetDate} earlier then ${this.startDate} (startTime)`);
        }
        if (resetDate > this.endDate) {
          console.log(`Time ${resetDate} later then ${this.endDate} (endTime)`);
        }
        console.log(`Setting time to ${resetDate}`);
        this.timeDiff = this.localTime.diff(resetDate);
        Cookies.set(Timer.timeDiffCookieName, String(this.timeDiff), {
          expires: Timer.cookieTTL
        });
      }
    } else {
      if (Cookies.get(Timer.timeDiffCookieName) === undefined) {
        this.timeDiff = this.localTime.diff(this.startDate);
        Cookies.set(Timer.timeDiffCookieName, String(this.timeDiff), {
          expires: Timer.cookieTTL
        });
      } else {
        const cookieDiff = Duration.fromISO(Cookies.get(Timer.timeDiffCookieName) as string);
        // Fallback to apptime if diffence is greater then play length and no explicit time is requsted
        if (DateTime.now().minus(cookieDiff) > endDate) {
          const lastAppTime = Cookies.get(Timer.timeCodeCookieName);
          if (lastAppTime !== undefined) {
            this.timeDiff = this.localTime.diff(DateTime.fromISO(lastAppTime, { zone: timezone }));
          } else {
            throw new Error("Couldn't set diff to local time!");
          }
        } else {
          this.timeDiff = cookieDiff;
        }
      }
    }
    this.setTimes();

    console.log(
      `Starting time is ${this.startDate} (UTC), time difference to current running time ${this.localTime} is ${this.timeDiff}, calculated application time is ${this.appTime}, local event time / app time (as '${this.timezone}' used for display) is ${this.displayTime}`
    );

    this.interval = setInterval(() => {
      this.setTimes();
      Cookies.set(Timer.timeCodeCookieName, String(this.appTime), {
        expires: Timer.cookieTTL
      });
    }, 1000);
  }

  setTimes(): void {
    this.localTime = DateTime.local({ setZone: false } as TimerOptions);
    this.appTime = this.localTime.minus(this.timeDiff).setZone("utc");
    this.displayTime = this.appTime.setZone(this.timezone);
  }

  formatTimecode(): string {
    return this.appTime.setZone(this.timezone).setLocale("en-us").toFormat("EEE MMM dd hh:mm:ss");
  }

  formatDate(): string {
    return this.appTime.setZone(this.timezone).setLocale("en-us").toFormat("EEE MMM dd");
  }

  formatTime(): string {
    return this.appTime.setZone(this.timezone).setLocale("en-us").toFormat("hh:mm");
  }

  formatURLTimecode(): string {
    return this.appTime.setZone(this.timezone).setLocale("en-us").toFormat("yyyy-LL-dd'T'HH:mm:ssZZ");
  }

  formatTimeWithSecs(): string {
    return this.appTime.setZone(this.timezone).setLocale("en-us").toFormat("hh:mm:ss");
  }
}

export default Timer;

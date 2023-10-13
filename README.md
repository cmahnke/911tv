9/11 on TV
==========

# Why

[11 September 2001](https://en.wikipedia.org/wiki/September_11_attacks) was not only an unprecedented terrorist attack, but also a special media event. The images have become iconic, of course, but also the density of events and length, mediated by live television coverage were without precedent.

I can still remember that day and the days that followed, how the event developed: first "just" a news ticker to a spectacular accident...
And further developments then led to more and more broadcasters taking up the unfolding events and accompanying it with special programmes.

The [impact of the event](https://en.wikipedia.org/wiki/September_11_attacks#Aftermath) is manifold. Besides the well-known global political, cultural ones, there are also social ones such as the [truther movement](https://en.wikipedia.org/wiki/9/11_truth_movement), which was certainly also fostered by contradictions and rumours in the context of the live coverage.

Of course, it is no longer possible today to recreate the reception situation of 9/11, if only because it is now known what happened and how it ended. But this page should at least be an attempt to recreate this situation and thus to create immersion. Contrary to current media usage habits, the television programme is linear, but you can change channels.

# How

In 2007, the Internet Archive set up the [September 11 Television Archive](https://archive.org/details/sept_11_tv_archive), a collection of TV broadcasts from 20 channels over 7 days, totalling about 3000 hours of material. Although mainly US channels, it also includes some international channels such as [BBC](https://en.wikipedia.org/wiki/BBC), [NTV](https://en.wikipedia.org/wiki/NTV_(Russia)), [TV Azteca](https://en.wikipedia.org/wiki/TV_Azteca) [MCM](https://en.wikipedia.org/wiki/MCM_(TV_channel)) and [CCTV-3](https://en.wikipedia.org/wiki/CCTV-3).

In addition, there is a [day view](https://archive.org/details/911), which is presented like an [EPG](https://en.wikipedia.org/wiki/Electronic_program_guide), which allows a good overview, but unfortunately also prevents immersion, as it forces constant interaction.

Therefore, this website summarises the videos and presents them in a very reduced user interface.

Contrary to current media usage habits, the TV programme is linear, but you can change channels.
Key events can be displayed as teletext sub titles. Teletext can also be deactivated and the "TV" displayed in full-screen mode. Loading the teletext panels can take some time.
If errors occur, such as longer loading times or missing recordings, there is a picture disturbance. This also occurs when you try to switch off the television.

# Credits

The implementation of this project was only possible through the publication of the [digitised television recordings by the Internet Archive](https://archive.org/details/911).

## Inspirations

The following examples have influenced the user interface:
* [Static TV noise](https://impossiblue.github.io/log/140528/index.html) by Bjørn Sortland
* [Teletext](https://codepen.io/jsanderson/pen/yoLLjv) by `jsanderson`

## Fonts and icons

* ["Press Start 2P" font](https://fonts.google.com/specimen/Press+Start+2P)
* [Info icon](https://commons.wikimedia.org/wiki/File:Infobox_info_icon.svg)
* [Teletext icon](https://commons.wikimedia.org/wiki/File:IEC_60417_-_Ref-No_5463.svg)

## Software components

In addition, the following software components were used:

## Data processing

* [Python](https://www.python.org/)
* [Beautiful Soup](https://www.crummy.com/software/BeautifulSoup/)
* [Python-Markdown](https://python-markdown.github.io/)
* [Python Frontmatter](https://github.com/eyeseast/python-frontmatter)
* [Requests](https://requests.readthedocs.io/)
* [termcolor](https://github.com/termcolor/termcolor)

## Presentation

* [JavaScript Cookie](https://github.com/js-cookie/js-cookie)
* [Luxon](https://moment.github.io/luxon/)
* [Normalize.css](https://necolas.github.io/normalize.css/)
* [React](https://reactjs.org/)
* [react-device-detect](https://github.com/duskload/react-device-detect#readme)
* [React Router](https://github.com/remix-run/react-router)
* [video.js](https://videojs.com/)

## Development

* [browserslist-to-esbuild](https://github.com/marcofugaro/browserslist-to-esbuild)
* [esbuild](https://esbuild.github.io/)
* [ESLint](https://eslint.org/)
* [html-react-parser](https://github.com/remarkablemark/html-react-parser#readme)
* [PostCSS](https://postcss.org/)
* [postcss-inline-svg](https://github.com/TrySound/postcss-inline-svg)
* [postcss-normalize](https://github.com/csstools/postcss-normalize)
* [postcss-svgo](https://github.com/cssnano/cssnano)
* [Sass](https://sass-lang.com/)
* [Vite](https://vitejs.dev/)

# About

9/11 on TV is a [Projektemacher](https://projektemacher.org/) project.

I had the idea about 10 years ago, around 2012, when I was regularly watching public domain films in the Internet Archive and stumbled across the 911 TV collection by chance. The initial idea was some sort of installation including a TV-Set, but the current web page is easier to implement.

# Notes
## Technical data
* PAL resolution: 720 x 576
* NTSC resolution:720 x 480
* [Teletext](https://en.wikipedia.org/wiki/Teletext) has 25 rows with 40 columns
* The Teletext loop can be up to 30 sec long

## Teletext
The Wikipedia has an article on [Teletext](https://en.wikipedia.org/wiki/Teletext). There were several JavaScript libraries for Teletext under consideration:

* [@techandsoftware/teletext](https://bitbucket.org/rahardy/teletext/src/master/)
* [teletext](https://github.com/andormade/teletext)

But since the Teletext functionality is only used to display some text, the teletext representation doesn't need to be 100% percent accurate.

There are several other interesting Teletext related sites, that might be interesting as well

* [Teletext for Raspberry Pi](https://github.com/ali1234/raspi-teletext)
* [Suite of tools for processing teletext signals recorded on VHS](https://github.com/ali1234/vhs-teletext)
* [The Teletext Archive](http://www.teletextarchive.com/)

# TODO:

* CSS
  * Info box
  * Frame
  * Buttons
* Texts and links
  * Subtitles
  * Content
* Video addressing
  * Channel switching without loading
  * Handle (buffering) events
* Data preprocessing
  * Check why GLVSN isn't working
  * check if sub pages are needed
* Reduce warnings
  * `react.development.js:209 Warning: forwardRef render functions do not support propTypes or defaultProps.`
* Reduce size
  * check [JSON compression](https://github.com/KilledByAPixel/JSONCrush)

![Projektemacher](./site/src/assets/svg/cm.svg)

const request = require("request-promise");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
//TODO: handle if there are no results found
const handleScrape = async (browser, term, counter) => {
  try {
    let url = encodeURI(term);

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (
        req.resourceType() == "stylesheet" ||
        req.resourceType() == "font" ||
        req.resourceType() == "image"
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto(url, { waitUntil: "networkidle2" });
    let bodyHTML = await page.evaluate(() => document.body.innerHTML);
    let $ = await cheerio.load(bodyHTML);
    await page.close();
    let videoTime = null;
    if (
      typeof $(
        $('[class="yt-simple-endpoint style-scope ytd-video-renderer"]')[0] !==
          "undefined"
      )
    ) {
      let data = $(
        '[class="yt-simple-endpoint style-scope ytd-video-renderer"]'
      )[0].attribs;

      //add retry when connection is lost
      let test = $('[class="style-scope ytd-child-video-renderer"]');
      if (typeof test[0] !== "undefined") {
        videoTime = test[1].childNodes[0].data;
      }
      console.log(data.href, data.title, videoTime);
      return {
        videoId: data.href.split("v=")[1],
        title: data.title,
        duration: videoTime,
        scraped: true,
        uniqueId: Math.random(),
        date: Date.now(),
      };
    } else {
      if (counter < 5) {
        //try again
        console.log("Trying again..");
        console.log(term);
        await timeout(300);
        return handleScrape(term, counter + 1);
      } else {
        return null;
      }
    }
  } catch (err) {
    await page.close();
    throw err;
  }
};

exports.searchScrape = async function (req, res, next) {
  //console.log(req.query.term);
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    let string = "https://www.youtube.com/results?search_query=";
    let term = req.query.item;
    term = term.replace("&", "");
    term = term.split(" ").join("+");
    term = string.concat(term);
    let url = encodeURI(term);
    console.log(url);
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(url, { waitUntil: "networkidle2" });
    let bodyHTML = await page.evaluate(() => document.body.innerHTML);
    await page.close();
    await browser.close();
    let $ = await cheerio.load(bodyHTML);
    let timeArray = [];
    let dataArray = [];

    let videoTime = $('[class="video-time"]');
    let href = {};
    let title = {};
    let data = $('[class="yt-simple-endpoint style-scope ytd-video-renderer"]');
    console.log(data.length);
    for (let i = 0; i < data.length; i++) {
      if (
        typeof $('[class="yt-simple-endpoint style-scope ytd-video-renderer"]')[
          i
        ] !== "undefined"
      ) {
        let data = $(
          '[class="yt-simple-endpoint style-scope ytd-video-renderer"]'
        )[i].attribs;
        href = data.href;
        title = data.title;
        if (href[1] === "w") {
          dataArray.push({
            videoId: href.split("v=")[1],
            title: title,
            uniqueId: Math.random(),
          });
        }
      }
      if (typeof videoTime[i] !== "undefined") {
        const videoTime2 = videoTime[i].children[0].data;
        timeArray.push(videoTime2);
      }
    }
    let array = dataArray.map((track, index) => ({
      title: track.title,
      uniqueId: track.uniqueId,
      videoId: track.videoId,
      duration: timeArray[index],
    }));
    res.json({ array });
  } catch {
    let array = [];
    await page.close();
    await browser.close();
    res.json({ array });
  }
};
exports.scrape = async function (req, res, next) {
  //console.log(req.body.term);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  let tracks = req.body.items;
  let promises = [];
  let string = "https://www.youtube.com/results?search_query=";
  for (let i = 0; i < tracks.length; i++) {
    let artistName = tracks[i].artistName;
    let title = tracks[i].title;
    let term = title + " " + artistName; //need to think about how to improve
    term = term.split(" ").join("+");
    term = string.concat(term);

    await timeout(100); //Delay so we won't get problems with too many requests to the page

    promises.push(handleScrape(browser, term, 0));
  }

  Promise.all(promises)
    .then(async (results) => {
      await browser.close();
      res.json(results);
    })
    .catch(async (e) => {
      await browser.close();
      res.json(e);
    });
};

const request = require("request-promise");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const stringSimilarity = require("string-similarity");
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Song = require("../models/song.model");
//TODO: handle if there are no results found
const handleScrape = async (browser, term, counter, globalTerm) => {
  try {
    await timeout(1000);
    let url = encodeURI(term);
    //console.log(url);
    const page = await browser.newPage();
    //console.log("new page?");
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
    //console.log("Before goto");
    //console.log(url);
    await timeout(300);
    await page.goto(url, { waitUntil: "networkidle2" });
    //console.log("After goto");
    let bodyHTML = await page.evaluate(() => document.body.innerHTML);
    let $ = await cheerio.load(bodyHTML);
    let timeArray = [];
    let dataArray = [];

    let videoTime = $("ytd-thumbnail-overlay-time-status-renderer");

    let href = {};
    let title = {};
    let data = $('[class="yt-simple-endpoint style-scope ytd-video-renderer"]');
    console.log(data.length);
    await page.close();
    if (
      typeof $(
        $('[class="yt-simple-endpoint style-scope ytd-video-renderer"]')[0] !==
          "undefined"
      )
    ) {
      for (let i = 0; i < data.length / 4; i++) {
        if (
          typeof $(
            '[class="yt-simple-endpoint style-scope ytd-video-renderer"]'
          )[i] !== "undefined"
        ) {
          let data = $(
            '[class="yt-simple-endpoint style-scope ytd-video-renderer"]'
          )[i].attribs;
          href = data.href;
          title = data.title;
          arialabel = data["aria-label"];
          if (href[1] === "w") {
            let seconds = "";
            let minutes = "";
            let splitted = arialabel.split(" ");
            for (let i = splitted.length - 2; i > 0; i--) {
              if (isNaN(splitted[i])) {
                //isnt number
                minutes = splitted[i - 4]; //i-4 for english?
                seconds = splitted[i - 2];
                break;
              }
            }
            if (seconds.length === 1) {
              seconds = "0" + seconds;
            }
            let time = minutes + "." + seconds;
            dataArray.push({
              videoId: href.split("v=")[1],
              title: title,
              uniqueId: Math.random(),
              duration: time,
            });
          }
        }
      }

      let array = dataArray.map((track, index) => ({
        title: track.title,
        uniqueId: track.uniqueId,
        videoId: track.videoId,
        duration: track.duration,
      }));
      for (const [i, obj] of array.entries()) {
        let song = new Song({
          title: obj.title,
          uniqueId: obj.uniqueId,
          videoId: obj.videoId,
          duration: obj.duration,
          term: [globalTerm],
        });
        song
          .save()
          .then()
          .catch(async (e) => {
            Song.findOne({ videoId: e.keyValue.videoId }).then((song) => {
              song.title = obj.title;
              song.duration = obj.duration;
              if (!song.term.includes(globalTerm)) {
                song.term.push(globalTerm);
              }
              song.save();
            });
            //console.log(e);
            let error = e;
          }); //errors come when we have videos in collections that we already have. no biggies
      }
      console.log(array[0]);
      await timeout(200);
      return {
        videoId: array[0].videoId,
        title: array[0].title,
        duration: array[0].duration,
        scraped: true,
        uniqueId: array[0].uniqueId,
        date: Date.now(),
      };
    } else {
      if (counter < 5) {
        //try again
        console.log("Trying again..");
        console.log(term);
        await timeout(300);
        return null;
        //eturn handleScrape(term, counter + 1);
      } else {
        return null;
      }
    }
  } catch (err) {
    console.log("we had an error: ", err);
  }
};

exports.searchScrape = async function (req, res, next) {
  //console.log(req.query.term);
  if (!req.query.item) return res.json({ error: "Error" });
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
    //console.log(url);
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(url, { waitUntil: "networkidle2" });
    let bodyHTML = await page.evaluate(() => document.body.innerHTML);
    await page.close();
    await browser.close();
    let $ = await cheerio.load(bodyHTML);
    let timeArray = [];
    let dataArray = [];

    let videoTime = $("ytd-thumbnail-overlay-time-status-renderer");

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
        arialabel = data["aria-label"];
        if (href[1] === "w") {
          let seconds = "";
          let minutes = "";
          let splitted = arialabel.split(" ");
          for (let i = splitted.length - 2; i > 0; i--) {
            if (isNaN(splitted[i])) {
              //isnt number
              minutes = splitted[i - 4]; //i-3 for english?
              seconds = splitted[i - 2];
              break;
            }
          }
          if (seconds.length === 1) {
            seconds = "0" + seconds;
          }
          let time = minutes + "." + seconds;
          dataArray.push({
            videoId: href.split("v=")[1],
            title: title,
            uniqueId: Math.random(),
            duration: time,
          });
        }
      }
    }
    let array = dataArray.map((track, index) => ({
      title: track.title,
      uniqueId: track.uniqueId,
      videoId: track.videoId,
      duration: track.duration,
    }));
    for (const [i, obj] of array.entries()) {
      let song = new Song({
        title: obj.title,
        uniqueId: obj.uniqueId,
        videoId: obj.videoId,
        duration: obj.duration,
        term: [req.query.item],
      });
      await song
        .save()
        .then()
        .catch(async (e) => {
          Song.findOne({ videoId: e.keyValue.videoId }).then((song) => {
            song.title = obj.title;
            song.duration = obj.duration;
            if (!song.term.includes(req.query.item)) {
              song.term.push(req.query.item);
            }
            song.save();
          });
          //console.log(e);
          let error = e;
        }); //errors come when we have videos in collections that we already have. no biggies
    }
    res.json({ array });
  } catch {
    let array = [];

    res.json({ array });
  }
};
exports.scrape = async function (req, res, next) {
  //console.log(req.body.term);
  let globalTerm = "";
  let found = false;
  //await timeout(200);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  let tracks = req.body.items;
  let promises = [];
  let string = "https://www.youtube.com/results?search_query=";
  let foundItems;
  console.log(tracks.length);
  for (let i = 0; i < tracks.length; i++) {
    found = false;
    foundItems = null;
    let artistName = tracks[i].artistName;
    let title = tracks[i].title;
    let term = title + " " + artistName; //need to think about how to improve
    globalTerm = term;
    let fullTitle = title + " " + artistName;
    term = term.split(" ").join("+");
    term = string.concat(term);

    let prevSimilarity = 0;
    let similarity = 0;
    let winnerIndex = 0;
    //await timeout(100); //Delay so we won't get problems with too many requests to the page
    //console.log("SEARCH: ", fullTitle);
    await Song.find({ $text: { $search: fullTitle } }, function (err, docs) {
      found = true;
      foundItems = docs;

      for (let j = 0; j < foundItems.length; j++) {
        //TODO: check for foundItems[j].videoId
        //if not found do something?
        //console.log(foundItems[j].title);
        for (let i = 0; i < 3; i++) {
          switch (i) {
            case 1:
              similarity = stringSimilarity.compareTwoStrings(
                foundItems[j].title,
                fullTitle
              );
              if (similarity > prevSimilarity) {
                prevSimilarity = similarity;
                winnerIndex = j;
              }
              break;
            case 2:
              similarity = stringSimilarity.compareTwoStrings(
                foundItems[j].title,
                fullTitle + " (Official Video)"
              );
              if (similarity > prevSimilarity) {
                prevSimilarity = similarity;
                winnerIndex = j;
              }
              break;
            case 3:
              similarity = stringSimilarity.compareTwoStrings(
                foundItems[j].title,
                fullTitle + " (Lyrics)"
              );
              if (similarity > prevSimilarity) {
                prevSimilarity = similarity;
                winnerIndex = j;
              }
              break;
          }
        }
      }
      console.log(prevSimilarity + " belong to index: " + winnerIndex);
      //console.log(fullTitle);
      //console.log(foundItems[winnerIndex]);

      //TODO: check for foundItems[j].videoId
      //if not found do something?
      //

      if (prevSimilarity >= 0.75) {
        var prom2 = new Promise(async function (resolve, reject) {
          // Do Stuff
          try {
            let videoId = foundItems[winnerIndex].videoId;
            let title = foundItems[winnerIndex].title;
            let duration = foundItems[winnerIndex].duration;
            let scraped = true;
            let uniqueId = foundItems[winnerIndex].uniqueId;
            let date = Date.now();
            //await timeout(2000);
            if (
              typeof foundItems[winnerIndex] === "undefined" ||
              typeof foundItems[winnerIndex].videoId === "undefined"
            ) {
              console.log("We encountered an error!");
              let res = await handleScrape(browser, term, 0, globalTerm);
              resolve(res);
              //return null; //here call scraper? somehow return a resolve from that?
            } else {
              resolve({
                videoId: videoId,
                title: title,
                duration: duration,
                scraped: scraped,
                uniqueId: uniqueId,
                date: date,
              });
            }
          } catch {
            console.log("We encountered an error!");
            let res = await handleScrape(browser, term, 0, globalTerm);
            resolve(res);
          }
        });
        console.log("Database sending");
        console.log(prom2);
        found = true;
        promises.push(prom2);
        // array.push('two');
      } else {
        console.log("Scraper sending.");
        promises.push(handleScrape(browser, term, 0, globalTerm));
      }

      if (err) {
        console.log("WE HAVE ERROR?");

        promises.push(handleScrape(browser, term, 0, globalTerm));
      }
    })
      .limit(20)
      .catch((e) => console.log("We got error here"));
  }
  await timeout(2000);
  Promise.all(promises)
    .then(async (results) => {
      console.log("Promises OK");
      await timeout(500);
      await browser.close();
      console.log("Sending: ", results.length);
      res.json(results);
    })
    .catch(async (e) => {
      console.log("Error from all promsies");
      await browser.close();
      res.json(e);
    });
};
exports.searchScrape_database = async function (req, res, next) {
  let term = req.query.item;
  console.log(term);
  Song.find({ $text: { $search: term } }, function (err, docs) {
    console.log(docs);
    res.json({ array: docs });
  })
    .limit(50)
    .catch((e) => res.json({ error: e }));
};
exports.updateDatabase = async function (req, res, next) {
  /* WORK IN PROGRESS*/
  Song.update(
    { videoTime: { $videoId: req.videoId } },
    { $inc: { duration: req.body.duration } }
  );
};

exports.autoCompleteYouTube = async function (req, res, next) {
  const item = req.query.item;
  let response = await axios.get(
    `https://clients1.google.com/complete/search?client=youtube&gs_ri=youtube&ds=yt&q=${item}`
  );

  if (response) {
    const searchSuggestions = [];
    response.data.split("[").forEach((ele, index) => {
      if (!ele.split('"')[1] || index === 1) return;
      if (ele.split('"')[1] !== "k") {
        return searchSuggestions.push({
          title: ele.split('"')[1],
          _id: Math.random(),
        });
      }
    });
    return res.json({ data: searchSuggestions });
  }
  return res.status(404).json({ error: "Error getting autocomplete" });
};

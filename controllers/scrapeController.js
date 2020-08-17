const request = require("request-promise");
const axios = require("axios");
const iconv = require("iconv-lite");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const stringSimilarity = require("string-similarity");
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Song = require("../models/song.model");
//TODO: handle if there are no results found
const handleScrape = async (term, counter, globalTerm) => {
  const result = await axios.post(
    "https://tubemusicsearch.herokuapp.com/search/",
    {
      search: term,
    }
  );
  const array = result.data;

  for (const [i, obj] of array.entries()) {
    let song = new Song({
      title: obj.title,
      uniqueId: Math.random(),
      videoId: obj.videoId,
      duration: obj.duration,
      term: [globalTerm],
      thumbnail: obj.thumbnails[0].url,
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

        let error = e;
      }); //errors come when we have videos in collections that we already have. no biggies
  }
  if (!array[0])
    console.log("NOT FOUND NOT FOUND NOT FOUND NOT FOUND NOT FOUND ");
  return array[0]
    ? {
        videoId: array[0].videoId,
        title: array[0].title,
        duration: array[0].duration,
        scraped: true,
        uniqueId: array[0].uniqueId,
        thumbnail: array[0].thumbnails[1].url,
        date: Date.now(),
      }
    : {};
};

exports.searchScrape = async function (req, res, next) {
  //console.log(req.query.term);
  if (!req.query.item) return res.json({ error: "Error" });
  const result = await axios.post(
    "https://tubemusicsearch.herokuapp.com/search/",
    {
      search: req.query.item,
    }
  );
  for (const [i, obj] of array.entries()) {
    let song = new Song({
      title: obj.title,
      uniqueId: Math.random(),
      videoId: obj.videoId,
      duration: obj.duration,
      term: [req.query.item],
      thumbnail: obj.thumbnails[1].url,
    });
    await song
      .save()
      .then()
      .catch(async (e) => {
        Song.findOne({ videoId: e.keyValue.videoId }).then((song) => {
          song.title = obj.title;
          song.duration = obj.duration;
          song.thumbnail = obj.thumbnails[1].url;
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
};
exports.scrape = async function (req, res, next) {
  //console.log(req.body.term);
  let globalTerm = "";
  let found = false;
  //await timeout(200);

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
              let res = await handleScrape(term, 0, globalTerm);
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
            let res = await handleScrape(term, 0, globalTerm);
            resolve(res);
          }
        });
        console.log("Database sending");
        found = true;
        promises.push(prom2);
        // array.push('two');
      } else {
        console.log("Scraper sending.");
        promises.push(handleScrape(term, 0, globalTerm));
      }

      if (err) {
        console.log("WE HAVE ERROR?");

        promises.push(handleScrape(term, 0, globalTerm));
      }
    })
      .limit(20)
      .catch((e) => console.log("We got error here"));
  }

  Promise.all(promises)
    .then(async (results) => {
      console.log("Promises OK");

      console.log("Sending: ", results.length);
      res.json(results);
    })
    .catch(async (e) => {
      console.log("Error from all promsies");

      res.json(e);
    });
};
exports.searchScrape_database = async function (req, res, next) {
  let term = req.query.item;
  //console.log(term);
  Song.find({ $text: { $search: term } }, function (err, docs) {
    //console.log(docs);
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
    `https://clients1.google.com/complete/search?client=youtube&gs_ri=youtube&ds=yt&q=${item}`,
    { responseType: "arraybuffer" }
  );

  if (response) {
    data = iconv.decode(response.data, "win1252");
    const searchSuggestions = [];
    data.split("[").forEach((ele, index) => {
      if (!ele.split('"')[1] || index === 1) return;
      if (ele.split('"')[1] !== "k") {
        return searchSuggestions.push({
          title: ele.split('"')[1],
          _id: Math.random(),
        });
      }
    });
    console.log(searchSuggestions);
    return res.json({ data: searchSuggestions });
  }
  return res.status(404).json({ error: "Error getting autocomplete" });
};

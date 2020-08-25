const axios = require("axios");
const iconv = require("iconv-lite");

const stringSimilarity = require("string-similarity");
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Song = require("../models/song.model");
//TODO: handle if there are no results found
const redis = require("redis"); //Cache
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const client = redis.createClient(REDIS_URL);
client.on("error", (err) => {
  console.log("Error " + err);
});
client.on("connect", function () {
  console.log("You are now connected");
});

const handleScrape = async (term, counter, globalTerm) => {
  const result = await axios.post(
    "https://tubemusicsearch.herokuapp.com/search/",
    {
      search: globalTerm,
    }
  );
  const array = result.data;

  /*  for (const [i, obj] of array.entries()) {
  
    let song = new Song({
      title: obj.title,
      uniqueId: Math.random(),
      videoId: obj.videoId,
      duration: obj.duration,
      term: [globalTerm],
      thumbnail: obj.thumbnails[0].url,
      thumbnails: obj.thumbnails,
      album: obj.album,
      artists: obj.artists,
      resultType: obj.resultType,
    });
    song
      .save()
      .then()
      .catch(async (e) => {
        Song.findOne({ videoId: e.keyValue.videoId }).then((song) => {
          song.title = obj.title;
          song.duration = obj.duration;
          song.thumbnail = obj.thumbnails[0].url;
          song.thumbnails = obj.thumbnails;
          song.album = obj.album;
          song.artists = obj.artists;
          song.resultType = obj.resultType;
          if (!song.term.includes(globalTerm)) {
            song.term.push(globalTerm);
          }

          song.save();
        });

        let error = e;
      });  */
  /*   if (!array) return undefined;
  if (!array[0]) return undefined;
  if (
    !array[0] ||
    !array[0].title ||
    !array[0].thumbnails ||
    !array[0].artists ||
    !array[0].album ||
    !array[0].videoId
  ) {
    console.log(
      globalTerm,
      ": NOT FOUND NOT FOUND NOT FOUND NOT FOUND NOT FOUND "
    );
    return undefined;
  } */

  let url = "";
  if (array[0] && array[0].thumbnails) {
    url = array[0].thumbnails[0].url;
  }
  return array[0]
    ? {
        videoId: array[0].videoId,
        title: array[0].title,
        duration: array[0].duration,
        scraped: true,
        uniqueId: Math.random() + Date.now(),
        thumbnail: url && url,
        album: array[0].album,
        artists: array[0].artists,
        resultType: array[0].resultType,
        date: Date.now(),
      }
    : undefined;
};

exports.searchScrape = async function (req, res, next) {
  //console.log(req.query.term);
  if (!req.query.item) return res.json({ error: "Error" });
  client.get("Searchyt" + req.query.item, async function (err, reply) {
    if (reply) {
      const array = JSON.parse(reply);
      if (!array) {
        res.json([]);
        return;
      }
      res.json({ array });
    } else {
      const result = await axios.post(
        "https://tubemusicsearch.herokuapp.com/search/",
        {
          search: req.query.item,
        }
      );
      const array = result.data;
      array.forEach((element) => {
        element.thumbnail = element.thumbnails[0].url;
        element.uniqueId = Math.random() + Date.now();
      });
      if (!array) {
        res.json([]);
        return;
      }

      res.json({ array });
      client.setex("Searchyt" + req.query.item, 3600, JSON.stringify(array));
      for (const [i, obj] of array.entries()) {
        let song = new Song({
          title: obj.title,
          uniqueId: Math.random(),
          videoId: obj.videoId,
          duration: obj.duration,
          term: [req.query.item],
          thumbnail: obj.thumbnails[0].url,
          album: obj.album,
          artists: obj.artists,
          resultType: obj.resultType,
        });
        obj.thumbnail = obj.thumbnails[0].url;
        await song
          .save()
          .then()
          .catch(async (e) => {
            Song.findOne({ videoId: e.keyValue.videoId }).then((song) => {
              song.title = obj.title;
              song.duration = obj.duration;
              song.thumbnail = obj.thumbnails[0].url;
              song.thumbnails = obj.thumbnails;
              song.album = obj.album;
              song.artists = obj.artists;
              song.resultType = obj.resultType;
              if (!song.term.includes(req.query.item)) {
                song.term.push(req.query.item);
              }
              song.save();
            });
            //console.log(e);
            let error = e;
          }); //errors come when we have videos in collections that we already have. no biggies
      }
    }
  });
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
      /*   console.log(prevSimilarity + " belong to index: " + winnerIndex); */

      if (prevSimilarity >= 1) {
        var prom2 = new Promise(async function (resolve, reject) {
          // Do Stuff
          try {
            let videoId = foundItems[winnerIndex].videoId;
            let title = foundItems[winnerIndex].title;
            let duration = foundItems[winnerIndex].duration;
            let scraped = true;
            let uniqueId = foundItems[winnerIndex].uniqueId;
            let album = foundItems[winnerIndex].album;
            let artists = foundItems[winnerIndex].artists;
            let thumbnail = foundItems[winnerIndex].thumbnail;
            let thumbnails = foundItems[winnerIndex].thumbnails;
            let date = Date.now();
            //await timeout(2000);
            if (
              typeof foundItems[winnerIndex] === "undefined" ||
              typeof foundItems[winnerIndex].videoId === "undefined"
            ) {
              console.log("We encountered an error!");
              let res = await handleScrape(
                term,
                0,
                tracks[i].title + " " + tracks[i].artistName
              );
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
                album: album,
                artists: artists,
                thumbnail: thumbnail,
                thumbnails: thumbnails,
              });
            }
          } catch {
            console.log("We encountered an error!");
            let res = await handleScrape(
              term,
              0,
              tracks[i].title + " " + tracks[i].artistName
            );
            resolve(res);
          }
        });
        console.log("Database sending");
        found = true;
        promises.push(prom2);
        // array.push('two');
      } else {
        console.log("Scraper sending.");

        promises.push(
          handleScrape(term, 0, tracks[i].title + " " + tracks[i].artistName)
        );
      }

      if (err) {
        console.log("WE HAVE ERROR?");

        promises.push(
          handleScrape(term, 0, tracks[i].title + " " + tracks[i].artistName)
        );
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
      console.log(e);
      res.json(e);
    });
};
exports.searchScrape_database = async function (req, res, next) {
  let term = req.query.item;
  //console.log(term);
  client.get("Searchdb" + req.query.item, async function (err, reply) {
    if (reply) {
      const array = JSON.parse(reply);
      res.json({ array });
    } else {
      Song.find({ $text: { $search: term } }, function (err, docs) {
        //console.log(docs);
        client.setex("Searchdb" + req.query.item, 360, JSON.stringify(docs));
        res.json({ array: docs });
      })
        .limit(50)
        .catch((e) => console.log(e));
    }
  });
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
    return res.json({ data: searchSuggestions });
  }
  return res.status(404).json({ error: "Error getting autocomplete" });
};

exports.searchArtists = async function (req, res, next) {
  if (!req.query.query) return res.json({ error: "Error" });
  client.get("Search" + req.query.query, async function (err, reply) {
    if (reply) {
      const array = JSON.parse(reply);
      res.json({ array });
    } else {
      const result = await axios.post(
        "https://tubemusicsearch.herokuapp.com/artistsearch/",
        {
          search: req.query.query,
        }
      );
      const array = result.data.slice(0, 12);
      client.setex("Search" + req.query.query, 3600, JSON.stringify(array));
      res.json({ array });
    }
  });
};
exports.getArtistData = async function (req, res, next) {
  if (!req.query.query) return res.json({ error: "Error" });
  client.get("Artist" + req.query.query, async function (err, reply) {
    if (reply) {
      const array = JSON.parse(reply);
      res.json({ array });
    } else {
      const result = await axios.post(
        "https://tubemusicsearch.herokuapp.com/get_artist/",
        {
          browseid: req.query.query,
        }
      );
      const array = result.data;
      client.setex("Artist" + req.query.query, 3600, JSON.stringify(array));
      res.json({ array });
    }
  });
};
/* TODO: add the result tracks from this to our database*/
exports.getPlaylist = async function (req, res, next) {
  if (!req.query.query) return res.json({ error: "Error" });
  const result = await axios.post(
    "https://tubemusicsearch.herokuapp.com/get_playlist/",
    {
      browseid: req.query.query,
    }
  );

  const array = result.data;
  res.json({ array });
};
exports.getAlbum = async function (req, res, next) {
  if (!req.query.query) return res.json({ error: "Error" });
  client.get(req.query.query, async function (err, reply) {
    if (reply) {
      console.log("Found from cache");
      const array = JSON.parse(reply);
      res.json({ array });
    } else {
      const result = await axios.post(
        "https://tubemusicsearch.herokuapp.com/get_album/",
        {
          browseid: req.query.query,
        }
      );

      const array = result.data;
      client.setex(req.query.query, 3600, JSON.stringify(array));
      res.json({ array });
      array.tracks.forEach(async (track) => {
        if (!track.videoId) return;
        const song = await Song.findOne({ videoId: track.videoId });
        if (song) {
          song.title = track.title;
          song.thumbnail = track.thumbnails[0].url;
          song.thumbnails = track.thumbnails;
          song.album = { name: array.title, id: req.query.query };
          song.artists = array.artist;
          song.uniqueId = Math.random() + track.title;
          song.resultType = "song";
          song.save();
          /*   console.log(song.album); */
        }
        if (!song) {
          let newsong = new Song({
            title: track.title,
            uniqueId: Math.random(),
            videoId: track.videoId,
            duration: format(track.lengthMs / 1000),
            thumbnail: track.thumbnails[0].url,
            thumbnails: track.thumbnails,
            album: { name: array.title, id: req.query.query },
            artists: array.artist,
            resultType: "song",
          });
          newsong.save();
        }
      });
    }
  });
};
exports.getAlbums = async function (req, res, next) {
  if (!req.query.browseId || !req.query.params)
    return res.json({ error: "Error" });

  client.get("Album" + req.query.browseId, async function (err, reply) {
    if (reply) {
      console.log("Sending from cache");
      const array = JSON.parse(reply);
      res.json({ array });
    } else {
      const result = await axios
        .post("https://tubemusicsearch.herokuapp.com/get_artist_albums/", {
          browseid: req.query.browseId,
          params: req.query.params,
        })
        .catch((e) => {
          res.status(500).json({ error: true });
        });

      const array = result.data;
      if (array) {
        client.setex("Album" + req.query.browseId, 3600, JSON.stringify(array));
        res.json({ array });
      }
    }
  });
};

function pad(string) {
  return ("0" + string).slice(-2);
}
function format(seconds) {
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = pad(date.getUTCSeconds());
  if (hh) {
    return `${hh}.${pad(mm)}.${ss}`;
  }
  return `${mm}.${ss}`;
}

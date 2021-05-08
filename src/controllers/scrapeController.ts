import { YoutubeSong } from "../lib/Types";
import SRedis from "../DAL/RedisInstance";
import Song from "../models/song.model";
const axios = require("axios");
const iconv = require("iconv-lite");

const RedisInstance = SRedis.getInstance();

const SECOND_BACKEND_URL = "https://tubemusicsearch.herokuapp.com/search/";
const handleScrape = async (
  globalTerm: any
): Promise<YoutubeSong | undefined> => {
  const result = await axios.post(SECOND_BACKEND_URL, {
    search: globalTerm,
  });
  const array = result.data;
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

export const searchScrape = async function (req: any, res: any, next: any) {
  // console.log(req.query.term);
  if (!req.query.item) return res.json({ error: "Error" });
  const reply = await RedisInstance.getValue("Searchyt" + req.query.item);
  if (reply) {
    res.json(reply);
  } else {
    const result = await axios.post(SECOND_BACKEND_URL, {
      search: req.query.item,
    });
    const array = result.data;
    array.forEach((element: any) => {
      const lastThumbnail = element.thumbnails.pop();
      element.thumbnail = lastThumbnail.url;
      element.uniqueId = Math.random() + Date.now();
    });
    if (!array) {
      res.json([]);
      return;
    }

    res.json({ array });
    RedisInstance.setKey("Searchyt" + req.query.item, array);
  }
};

export const scrape = async function (req: any, res: any, next: any) {
  const tracks = req.body.items;
  const promises: any = [];

  console.log(tracks.length);
  for (let i = 0; i < tracks.length; i++) {
    promises.push(handleScrape(tracks[i].title + " " + tracks[i].artistName));
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
export const searchScrape_database = async function (
  req: any,
  res: any,
  next: any
) {
  const array: any[] = [];
  req.json(array);
};
export const updateDatabase = async function (req: any, res: any, next: any) {
  /* WORK IN PROGRESS*/
  Song.update(
    { videoTime: { $videoId: req.videoId } },
    { $inc: { duration: req.body.duration } }
  );
};

export const autoCompleteYouTube = async function (
  req: any,
  res: any,
  next: any
) {
  const item = req.query.item;

  const response = await axios.get(
    `https://clients1.google.com/complete/search?client=youtube&gs_ri=youtube&ds=yt&q=${item}`,
    { responseType: "arraybuffer" }
  );

  if (response) {
    const data = iconv.decode(response.data, "win1252");
    const searchSuggestions: any = [];
    data.split("[").forEach((ele: any, index: any) => {
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

export const searchArtists = async function (req: any, res: any, next: any) {
  if (!req.query.query) return res.json({ error: "Error" });
  const reply = await RedisInstance.getValue("Search" + req.query.query);

  if (reply) {
    const array = reply;
    res.json({ array });
  } else {
    const result = await axios.post(
      "https://tubemusicsearch.herokuapp.com/artistsearch/",
      {
        search: req.query.query,
      }
    );
    const array = result.data.slice(0, 12);
    RedisInstance.setKey("Search" + req.query.query, array);
    res.json({ array });
  }
};
export const getArtistData = async function (req: any, res: any, next: any) {
  if (!req.query.query) return res.json({ error: "Error" });
  const reply = await RedisInstance.getValue("Artist" + req.query.query);
  if (reply) {
    console.log("Sent from cache");
    const array = reply;
    res.json({ array });
  } else {
    const result = await axios.post(
      "https://tubemusicsearch.herokuapp.com/get_artist/",
      {
        browseid: req.query.query,
      }
    );
    const array = result.data;
    RedisInstance.setKey("Artist" + req.query.query, array);
    res.json({ array });
  }
};
/* TODO: add the result tracks from this to our database*/
export const getPlaylist = async function (req: any, res: any, next: any) {
  if (!req.query.query) return res.json({ error: "Error" });
  const reply = await RedisInstance.getValue("Tracks" + req.query.query);
  if (reply) {
    console.log("Sending from cache.");
    const array = reply;
    res.json({ array });
  } else {
    const result = await axios.post(
      "https://tubemusicsearch.herokuapp.com/get_playlist/",
      {
        browseid: req.query.query,
      }
    );
    const array = result.data;
    res.json({ array });
    RedisInstance.setKey("Tracks" + req.query.query, array);
  }
};
export const getAlbum = async function (req: any, res: any, next: any) {
  if (!req.query.query) return res.json({ error: "Error" });
  const reply = await RedisInstance.getValue("Album" + req.query.query);
  if (reply) {
    console.log("Sending from cache");
    const array = reply;
    res.json({ array });
  } else {
    const result = await axios.post(
      "https://tubemusicsearch.herokuapp.com/get_album/",
      {
        browseid: req.query.query,
      }
    );
    const array = result.data;
    RedisInstance.setKey("Album" + req.query.query, array);
    res.json({ array });
  }
};
export const getAlbums = async function (req: any, res: any, next: any) {
  if (!req.query.browseId || !req.query.params) {
    return res.json({ error: "Error" });
  }
  const reply = await RedisInstance.getValue("Album" + req.query.browseId);
  if (reply) {
    console.log("Sending from cache");
    const array = reply;
    res.json({ array });
  } else {
    const result = await axios
      .post("https://tubemusicsearch.herokuapp.com/get_artist_albums/", {
        browseid: req.query.browseId,
        params: req.query.params,
      })
      .catch((e: any) => {
        res.status(500).json({ error: true });
      });
    const array = result.data;
    if (array) {
      RedisInstance.setKey("Album" + req.query.browseId, array);
      res.json({ array });
    }
  }
};

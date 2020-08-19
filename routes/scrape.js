var express = require("express");
var router = express.Router();
var scrape_controller = require("../controllers/scrapeController");
var auth = require("../middleware/auth");
/* GET users listing. */

router.post("/scrape", auth, scrape_controller.scrape);
router.get("/search", auth, scrape_controller.searchScrape);
router.get("/dbsearch", auth, scrape_controller.searchScrape_database);
router.get("/autocomplete", auth, scrape_controller.autoCompleteYouTube);
router.get("/search_artists", auth, scrape_controller.searchArtists);
router.get("/get_artist_data", auth, scrape_controller.getArtistData);
router.get("/get_playlist", auth, scrape_controller.getPlaylist);
router.get("/get_album", auth, scrape_controller.getAlbum);
module.exports = router;

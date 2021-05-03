import express from "express";
const router = express.Router();
import * as scrape_controller from "../controllers/scrapeController";
import auth from "../middleware/auth";

router.post("/scrape", auth, scrape_controller.scrape);
router.get("/search", auth, scrape_controller.searchScrape);
router.get("/dbsearch", auth, scrape_controller.searchScrape_database);
router.get("/autocomplete", auth, scrape_controller.autoCompleteYouTube);
router.get("/search_artists", auth, scrape_controller.searchArtists);
router.get("/get_artist_data", auth, scrape_controller.getArtistData);
router.get("/get_playlist", auth, scrape_controller.getPlaylist);
router.get("/get_album", auth, scrape_controller.getAlbum);
router.get("/get_artist_albums", auth, scrape_controller.getAlbums);
export default router;

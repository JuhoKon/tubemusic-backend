import * as WebSocket from "ws";
import UserService from "./WS/Users";

const initWebSocket = (server: any) => {
  const userService = UserService.getInstance();
  //initialize the WebSocket server instance
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws: WebSocket) => {
    ws.send("Hi there, I am a WebSocket server");

    ws.on("message", (message: string) => {
      //log the received message and send it back to the client
      try {
        const json = JSON.parse(message);
        switch (json.method) {
          case methods.init:
            ws.send("Init");
            userService.addUser(json.user);
            break;
          case methods.resumePlaying:
            ws.send("resume playing");
            break;
          case methods.pauseSong:
            ws.send("pause song");
            break;
          default:
            ws.send("Did not recognize request.");
            break;
        }
      } catch (error) {
        console.log(error);
        ws.send("Erroria pukkaa. ", error);
      }
    });

    //send immediatly a feedback to the incoming connection
    ws.send("Hi there, I am a WebSocket server");
  });
};

export default initWebSocket;

const methods = {
  init: "init",
  resumePlaying: "resumePlaying",
  pauseSong: "pauseSong",
};
/**
 * Need to seriously plan this beforehand. how to notify user that they have an active session etc...
 * Recognizing done via id. Each user can have multiple sessions, but only one as active, and that active session
 * Will be the one playing audio. User-class should be done?
 */

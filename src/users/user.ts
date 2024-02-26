import bodyParser from "body-parser";
import express, {Request, Response} from "express";
import { BASE_USER_PORT } from "../config";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // 1.2
  _user.get("/status", (req, res) => {
    res.send("live");
  });
  

  // 2.2
  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  _user.get("/getLastReceivedMessage", (req: Request, res: Response) => {
    res.json({ result: lastReceivedMessage });
  });
  
  _user.get("/getLastSentMessage", (req: Request, res: Response) => {
    res.json({ result: lastSentMessage });
  });
  
  // 4
  _user.post("/message", (req: Request<{}, {}, SendMessageBody>, res: Response) => {
    const { message } = req.body;
    lastReceivedMessage = message;
    res.json({ success: true, message: "Message received successfully" });
  });


  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}

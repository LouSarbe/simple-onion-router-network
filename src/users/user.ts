import bodyParser from "body-parser";
import express, {Request, Response} from "express";
import { BASE_USER_PORT } from "../config";
import {
  generateRsaKeyPair,
  symEncrypt,
  exportSymKey,
  importSymKey,
  exportPubKey,
  importPubKey,
  rsaEncrypt,
  createRandomSymmetricKey,
} from "../crypto";
import { Node, RegisterNodeBody, GetNodeRegistryBody } from "../registry/registry";

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
    res.send("success");
  });

  // 6.1
  _user.post("/sendMessage", async (req: Request<{}, {}, SendMessageBody>, res: Response) => {
    const { message, destinationUserId } = req.body;
    try {
      await fetch(`http://localhost:${BASE_USER_PORT + destinationUserId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message }),
      });
      lastSentMessage = message;
      return res.send("success");
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });


  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}

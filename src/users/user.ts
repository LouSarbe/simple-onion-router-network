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

  // 6.1
  _user.post("/sendMessage", async (req: Request<{}, {}, SendMessageBody>, res: Response) => {
    const { message, destinationUserId } = req.body;

    try {
      // Fetch node registry to get circuit information
      const registryResponse = await fetch(`http://localhost:3001/nodeRegistry`);
      const registryData: { nodes: { nodeId: number; pubKey: string; }[] } = await registryResponse.json();
      const nodes = registryData.nodes;


      const shuffledNodes = nodes.sort(() => Math.random() - 0.5).slice(0, 3);

      const symmetricKeys: string[] = [];
      for (let i = 0; i < 3; i++) {
        const symmetricKey = await exportSymKey(await createRandomSymmetricKey());
        symmetricKeys.push(symmetricKey);
      }

      let encryptedMessage = message;
      for (let i = 0; i < 3; i++) {
        const destination = ("000000" + (BASE_USER_PORT + shuffledNodes[i].nodeId)).slice(-10);

        const encryptedKey = await rsaEncrypt(symmetricKeys[i], shuffledNodes[i].pubKey);
        const encryptedData = await symEncrypt(await importSymKey(symmetricKeys[i]), encryptedMessage);

        encryptedMessage = encryptedData + encryptedKey + destination;
      }

      await fetch(`http://localhost:${BASE_USER_PORT + shuffledNodes[0].nodeId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: encryptedMessage }),
      });

      lastSentMessage = message;
      res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}

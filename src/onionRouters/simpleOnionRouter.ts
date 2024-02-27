import bodyParser from "body-parser";
import express, {Request, Response} from "express";
import { BASE_ONION_ROUTER_PORT } from "../config";
import { rsaDecrypt } from "../crypto";
import { webcrypto } from "crypto";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // 1.1
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  
  // 2.1
  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;

  onionRouter.get("/getLastReceivedEncryptedMessage", (req: Request, res: Response) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });
  
  onionRouter.get("/getLastReceivedDecryptedMessage", (req: Request, res: Response) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });
  
  onionRouter.get("/getLastMessageDestination", (req: Request, res: Response) => {
    res.json({ result: lastMessageDestination });
  });

  // 6.2
  onionRouter.post("/message", async (req: Request, res: Response) => {
    const privateKey = (await fetch(`http://localhost:8080/getPrivateKey`)).json();
    const { message }: { message: string } = req.body;
    if (privateKey instanceof webcrypto.CryptoKey){
      const decryptedMessage = await rsaDecrypt(message,privateKey);
      const nextDestination = extractNextDestination(decryptedMessage);

    forwardMessage(decryptedMessage, nextDestination);

    lastReceivedEncryptedMessage = message;
    lastReceivedDecryptedMessage = decryptedMessage;
    lastMessageDestination = nextDestination;

    return res.json({ success: true/*, message: "Message received and forwarded successfully"*/ });
    }
    else{
      return res.status(500).json({ error: "Failed to decrypt message" });
    }
    
  });

  function extractNextDestination(decryptedMessage: string): number {
    // Extract the next destination from the decrypted message
    // This could involve parsing the message or extracting specific information
    // In this example, we assume a simple format where the next destination is encoded in the message
    return parseInt(decryptedMessage.substring(0, 4)); // Extract the first 4 characters as the next destination
  }
  
  async function forwardMessage(decryptedMessage: string, nextDestination: number) {
    try {
      const response = await fetch(`http://localhost:${nextDestination}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: decryptedMessage })
      });
  
      if (!response.ok) {
        throw new Error(`Failed to forward message to destination ${nextDestination}`);
      }
  
      console.log(`Forwarded message "${decryptedMessage}" to destination: ${nextDestination}`);
    } catch (error) {
      console.error('Error forwarding message:', error);
    }
  }


  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}

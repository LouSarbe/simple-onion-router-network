import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";
import { generateRsaKeyPair } from "../crypto";
import { webcrypto } from "crypto";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // 1.3
  _registry.get("/status", (req: Request, res: Response) => {
    res.send("live");
  });
  

  // 3.1
  let registeredNodes: Node[] = [];

  _registry.post("/registerNode", (req: Request<{}, {}, RegisterNodeBody>, res: Response) => {
    const { nodeId, pubKey } = req.body;

    const existingNode = registeredNodes.find(node => node.nodeId === nodeId);

    if (existingNode) {
      return res.status(400).json({ error: "Node already registered" });
    }

    const newNode: Node = { nodeId, pubKey };
    registeredNodes.push(newNode);

    return res.status(201).json({ success: true, node: newNode });
  });

  _registry.get("/registeredNodes", (req: Request, res: Response) => {
    res.json({ nodes: registeredNodes });
  });

  // 3.2
  let privateKey: webcrypto.CryptoKey | null = null;

  _registry.get("/getPrivateKey", async (req: Request, res: Response) => {
    // 3.3
    if (!privateKey) {
      try {
        const { privateKey: generatedPrivateKey } = await generateRsaKeyPair();
        privateKey = generatedPrivateKey;
      } catch (error) {
        console.error("Error generating private key:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
    return res.json({ result: privateKey });
  });

  // 3.4
  _registry.get("/getNodeRegistry", (req: Request, res: Response) => {
    const nodeRegistryPayload = { nodes: registeredNodes };
    res.json(nodeRegistryPayload);
  });


  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}

import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

let appPromise: Promise<express.Express> | undefined;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const app = express();
      const httpServer = createServer(app);

      app.use(
        express.json({
          verify: (req, _res, buf) => {
            req.rawBody = buf;
          },
        }),
      );
      app.use(express.urlencoded({ extended: false }));

      await registerRoutes(httpServer, app);

      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });

      return app;
    })();
  }

  return appPromise;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return (app as any)(req, res);
}

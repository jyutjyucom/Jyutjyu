interface WorkerAssetsBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

const getWorkerAssetsBinding = (): WorkerAssetsBinding | null => {
  const assets = (
    globalThis as typeof globalThis & {
      __env__?: {
        ASSETS?: WorkerAssetsBinding;
      };
    }
  ).__env__?.ASSETS;

  if (!assets || typeof assets.fetch !== "function") {
    return null;
  }

  return assets;
};

const toAssetRequestUrl = (assetPath: string): string => {
  const normalizedPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return `https://assets.local${normalizedPath}`;
};

const toLocalPublicPath = (assetPath: string): string => {
  const normalizedPath = assetPath.replace(/^\/+/, "");
  return normalizedPath ? `public/${normalizedPath}` : "public";
};

export const fetchAssetJson = async <T>(assetPath: string): Promise<T> => {
  const assets = getWorkerAssetsBinding();
  if (assets) {
    const response = await assets.fetch(new Request(toAssetRequestUrl(assetPath)));
    if (!response.ok) {
      throw new Error(
        `Failed to load asset ${assetPath} from ASSETS binding (${response.status})`,
      );
    }

    return (await response.json()) as T;
  }

  if (import.meta.client) {
    return $fetch<T>(assetPath);
  }

  const [{ readFile }, { resolve }] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ]);
  const assetFilePath = resolve(process.cwd(), toLocalPublicPath(assetPath));
  const raw = await readFile(assetFilePath, "utf8");
  return JSON.parse(raw) as T;
};

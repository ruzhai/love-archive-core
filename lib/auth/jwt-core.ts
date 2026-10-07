import { SignJWT, jwtVerify } from "jose";

/**
 * Edge 兼容的 JWT 内核：只用 Web Crypto（jose），不碰 Node API，也不带
 * `server-only`，因此 Edge Middleware 能直接 import 做验签——中间件必须
 * 自己验签，否则伪造一个 la_token=任意值就能过鉴权墙。
 *
 * Node 侧请从 `./jwt` 引入（那层保留 server-only 保护）。
 */

const TOKEN_EXPIRATION = "7d";
const ALGORITHM = "HS256";
const DEV_SECRET = "dev-secret-change-me-in-production-64-bytes-minimum!!";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret) return new TextEncoder().encode(secret);

  // 生产环境缺密钥就启动即失败，而不是悄悄用这个公开的默认串签名
  // ——那等于没有鉴权，任何人都能自签一个管理员 token。
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET 未设置：生产环境必须提供签名密钥");
  }
  return new TextEncoder().encode(DEV_SECRET);
}

export interface JwtPayload {
  userId: number;
  username: string;
  displayName: string;
  role: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      // 显式限定算法，避免 alg 混淆。
      algorithms: [ALGORITHM],
    });
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

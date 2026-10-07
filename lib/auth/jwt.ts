import "server-only";

// 实现放在 jwt-core.ts（Edge 兼容，Middleware 要用）。这里保留 server-only
// 边界，防止签名密钥逻辑被误打进客户端 bundle。
export { signToken, verifyToken } from "./jwt-core";
export type { JwtPayload } from "./jwt-core";

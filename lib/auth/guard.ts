import { NextResponse } from "next/server";

/**
 * 读取类接口的 401 响应，形状与 middleware 拒绝 API 时保持一致。
 *
 * 为什么 GET 还要自己挡一道：middleware 的匹配表是唯一防线，一旦被绕过
 * （matcher 改动、AUTH_FREE_PREFIXES 加了前缀、将来换鉴权方案），所有
 * GET 接口就会在无鉴权的情况下直接吐私密数据。handler 里再验一次是
 * 纵深防御，代价只是一次内存库查询。
 */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    { success: false, error: "需要登录" },
    { status: 401 }
  );
}

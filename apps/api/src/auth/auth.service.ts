import { createHash, randomBytes } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service.js";

const tokenResponse = z.object({
  code: z.number().default(0),
  access_token: z.string().optional(),
  token_type: z.string().optional(),
});
const userResponse = z.object({
  data: z.object({ open_id: z.string(), name: z.string() }),
});
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const permissions = {
  EMPLOYEE: ["content:read"],
  EDITOR: ["content:read", "content:write", "organization:write-profile"],
  ADMIN: [
    "content:read",
    "content:write",
    "content:rollback",
    "organization:write-profile",
    "system-links:write",
    "users:write-role",
    "integrations:operate",
    "audit:read",
  ],
} as const;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  loginUrl(state: string) {
    const appId = process.env.FEISHU_APP_ID;
    const redirect = process.env.FEISHU_REDIRECT_URI;
    if (!appId || !redirect) throw new Error("Feishu OAuth is not configured");
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirect,
      state,
    });
    return `https://accounts.feishu.cn/open-apis/authen/v1/authorize?${params}`;
  }

  async exchangeCode(code: string) {
    const base = process.env.FEISHU_API_BASE_URL ?? "https://open.feishu.cn";
    const response = await fetch(`${base}/open-apis/authen/v2/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.FEISHU_APP_ID,
        client_secret: process.env.FEISHU_APP_SECRET,
        code,
        redirect_uri: process.env.FEISHU_REDIRECT_URI,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new UnauthorizedException({
        code: "FEISHU_OAUTH_FAILED",
        message: "飞书登录失败",
      });
    const token = tokenResponse.parse(await response.json());
    if (token.code !== 0 || !token.access_token)
      throw new UnauthorizedException({
        code: "FEISHU_OAUTH_FAILED",
        message: "飞书授权码无效",
      });
    const userRequest = await fetch(`${base}/open-apis/authen/v1/user_info`, {
      headers: { authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!userRequest.ok)
      throw new UnauthorizedException({
        code: "FEISHU_PROFILE_FAILED",
        message: "无法读取飞书用户",
      });
    return userResponse.parse(await userRequest.json()).data;
  }

  async createLogin(openId: string, displayName: string) {
    const user = await this.prisma.user.upsert({
      where: { openId },
      create: { openId, displayName },
      update: { displayName },
    });
    if (user.status !== "ACTIVE")
      throw new UnauthorizedException({
        code: "USER_DISABLED",
        message: "账号已停用",
      });
    const sessionToken = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(24).toString("base64url");
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: digest(sessionToken),
        csrfHash: digest(csrfToken),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });
    return { user, sessionToken, csrfToken };
  }

  async me(userId: string, csrfToken = "") {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return {
      id: user.id,
      feishuOpenId: user.openId,
      displayName: user.displayName,
      role: user.role,
      status: user.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      permissions: permissions[user.role],
      csrfToken,
    };
  }

  async logout(rawToken: string | undefined) {
    if (rawToken)
      await this.prisma.session.updateMany({
        where: { tokenHash: digest(rawToken) },
        data: { revokedAt: new Date() },
      });
  }

  async promoteForDevelopment(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: "ADMIN" },
    });
  }
}

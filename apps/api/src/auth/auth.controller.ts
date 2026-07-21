import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { CurrentAuth, Public } from "./auth.decorators.js";

const secure = () => process.env.NODE_ENV === "production";
const cookieBase = () => ({
  secure: secure(),
  sameSite: "lax" as const,
  path: "/",
});

@Controller()
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Get("auth/feishu/login")
  login(@Res() res: Response) {
    const state = randomBytes(24).toString("base64url");
    res.cookie("orosaga_oauth_state", state, {
      ...cookieBase(),
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(this.auth.loginUrl(state));
  }

  @Public()
  @Get("auth/feishu/callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const expected =
      (req.cookies?.orosaga_oauth_state as string | undefined) ?? "";
    const valid =
      expected.length === state?.length &&
      expected.length > 0 &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(state));
    if (!code || !valid)
      throw new UnauthorizedException({
        code: "OAUTH_STATE_INVALID",
        message: "登录状态校验失败",
      });
    const profile = await this.auth.exchangeCode(code);
    const login = await this.auth.createLogin(profile.open_id, profile.name);
    this.setSession(res, login.sessionToken, login.csrfToken);
    res.clearCookie("orosaga_oauth_state", cookieBase());
    res.redirect(process.env.PUBLIC_ORIGIN ?? "/");
  }

  @Public()
  @Post("auth/dev-login")
  @HttpCode(200)
  async devLogin(@Res() res: Response) {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.AUTH_DEV_BYPASS !== "true"
    ) {
      throw new UnauthorizedException({
        code: "DEV_LOGIN_DISABLED",
        message: "开发登录未启用",
      });
    }
    const login = await this.auth.createLogin("ou_local_admin", "本地管理员");
    await this.auth.promoteForDevelopment(login.user.id);
    this.setSession(res, login.sessionToken, login.csrfToken);
    res.json({ ok: true });
  }

  @Get("api/v1/me")
  me(@CurrentAuth() auth: Express.Request["auth"], @Req() req: Request) {
    return this.auth.me(
      auth!.userId,
      (req.cookies?.orosaga_csrf as string | undefined) ?? "",
    );
  }

  @Post("api/v1/logout")
  async logout(@Req() req: Request, @Res() res: Response) {
    await this.auth.logout(req.cookies?.orosaga_session as string | undefined);
    res.clearCookie("orosaga_session", cookieBase());
    res.clearCookie("orosaga_csrf", cookieBase());
    res.status(204).send();
  }

  private setSession(res: Response, sessionToken: string, csrfToken: string) {
    res.cookie("orosaga_session", sessionToken, {
      ...cookieBase(),
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.cookie("orosaga_csrf", csrfToken, {
      ...cookieBase(),
      httpOnly: false,
      maxAge: 8 * 60 * 60 * 1000,
    });
  }
}

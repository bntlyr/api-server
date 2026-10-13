import { Controller, Get, Header, NotFoundException } from "@nestjs/common";
import { Public } from "../guards/jwt-auth.guard.js";
import { getPublicKey } from "../helpers/security.helper.js";

@Controller("auth")
export class AuthController {
  @Public()
  @Get("public-key")
  @Header("Content-Type", "text/plain")
  getPublicKey(): string {
    const key = getPublicKey();
    if (!key) {
      throw new NotFoundException("Authentication public key is not configured");
    }
    return key;
  }
}

export interface Principal {
  userId: string;
  sessionId: string;
  tokenVersion: number;
}

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  ver: number;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  family: string;
  type: "refresh";
}

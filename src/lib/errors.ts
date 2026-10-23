export class GlowError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "GlowError";
    this.status = status;
    this.code = code;
  }
}

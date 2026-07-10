import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateGitRepositoryDto } from "./create-git-repository.dto";

describe("CreateGitRepositoryDto", () => {
  const base = {
    provider: "GITHUB",
    repositoryKey: "ai-bytedance/Veritab",
    name: "Veritab",
    webUrl: "https://github.com/ai-bytedance/Veritab",
    defaultBranch: "main",
  };

  it("accepts a secret-manager reference", async () => {
    expect(await validate(plainToInstance(CreateGitRepositoryDto, { ...base, credentialRef: "vault://veritab/git/token" }))).toHaveLength(0);
  });

  it("rejects plaintext access tokens and non-HTTPS repository URLs", async () => {
    expect(await validate(plainToInstance(CreateGitRepositoryDto, { ...base, credentialRef: "ghp_plaintext", webUrl: "http://github.com/ai-bytedance/Veritab" }))).not.toHaveLength(0);
  });
});

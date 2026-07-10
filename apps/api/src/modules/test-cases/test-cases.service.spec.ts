import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { TestCaseFolderInputDto } from "./dto/sync-test-case-folders.dto";
import { TestCasesService } from "./test-cases.service";

describe("TestCasesService folder hierarchy", () => {
  const service = new TestCasesService({} as PrismaService);
  const validate = (folders: TestCaseFolderInputDto[]) =>
    (
      service as unknown as {
        validateAndOrderFolders(values: TestCaseFolderInputDto[]): TestCaseFolderInputDto[];
      }
    ).validateAndOrderFolders(folders);

  it("orders a parent before its child regardless of input order", () => {
    const result = validate([
      { clientKey: "child", name: "Child", parentKey: "root", position: 0 },
      { clientKey: "root", name: "Root", position: 0 },
    ]);
    expect(result.map((item) => item.clientKey)).toEqual(["root", "child"]);
  });

  it("rejects duplicate client keys", () => {
    expect(() =>
      validate([
        { clientKey: "same", name: "One", position: 0 },
        { clientKey: "same", name: "Two", position: 1 },
      ]),
    ).toThrow(BadRequestException);
  });

  it("rejects missing parents and hierarchy cycles", () => {
    expect(() => validate([{ clientKey: "child", name: "Child", parentKey: "missing", position: 0 }])).toThrow(
      BadRequestException,
    );
    expect(() =>
      validate([
        { clientKey: "a", name: "A", parentKey: "b", position: 0 },
        { clientKey: "b", name: "B", parentKey: "a", position: 0 },
      ]),
    ).toThrow(BadRequestException);
  });
});

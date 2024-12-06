import { fileBlockParser } from "./fileBlockParser.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";

const mockConfig: CodeSpinConfig = {} as any;

describe("fileBlockParser", () => {
  describe("backtick format", () => {
    it("parses a single code block with space after File path:", async () => {
      const input = `
File path: src/files/readJson.ts
\`\`\`
export function readJson() {}
\`\`\`
`;
      const result = await fileBlockParser(input, "", undefined, mockConfig);
      expect(result).toEqual([
        {
          path: "src/files/readJson.ts",
          content: "export function readJson() {}",
        },
      ]);
    });

    it("parses a single code block without space after File path:", async () => {
      const input = `
File path:src/files/readJson.ts
\`\`\`
export function readJson() {}
\`\`\`
`;
      const result = await fileBlockParser(input, "", undefined, mockConfig);
      expect(result).toEqual([
        {
          path: "src/files/readJson.ts",
          content: "export function readJson() {}",
        },
      ]);
    });

    it("parses a single code block with language specified after File path:", async () => {
      const input = `
File path:src/files/readJson.ts
\`\`\`typescript
export function readJson() {}
\`\`\`
`;
      const result = await fileBlockParser(input, "", undefined, mockConfig);
      expect(result).toEqual([
        {
          path: "src/files/readJson.ts",
          content: "export function readJson() {}",
        },
      ]);
    });

    it("parses multiple code blocks with and without spaces", async () => {
      const input = `
File path: src/files/readJson.ts
\`\`\`
export function readJson() {}
\`\`\`
File path:src/files/writeJson.ts
\`\`\`
export function writeJson() {}
\`\`\`
`;
      const result = await fileBlockParser(input, "", undefined, mockConfig);
      expect(result).toEqual([
        {
          path: "src/files/readJson.ts",
          content: "export function readJson() {}",
        },
        {
          path: "src/files/writeJson.ts",
          content: "export function writeJson() {}",
        },
      ]);
    });

    it("handles empty input gracefully", async () => {
      const input = ``;
      const result = await fileBlockParser(input, "", undefined, mockConfig);
      expect(result).toEqual([]);
    });

    it("ignores content between code blocks", async () => {
      const input = `
File path: src/files/readJson.ts
\`\`\`
export function readJson() {}
\`\`\`

Some content here which should be ignored.

File path:src/files/writeJson.ts
\`\`\`
export function writeJson() {}
\`\`\`
`;
      const result = await fileBlockParser(input, "", undefined, mockConfig);
      expect(result).toEqual([
        {
          path: "src/files/readJson.ts",
          content: "export function readJson() {}",
        },
        {
          path: "src/files/writeJson.ts",
          content: "export function writeJson() {}",
        },
      ]);
    });

    it("ignores content between and after code blocks", async () => {
      const input = `
File path: src/files/readJson.ts
\`\`\`
export function readJson() {}
\`\`\`

Some content here which should be ignored.

File path:src/files/writeJson.ts
\`\`\`
export function writeJson() {}
\`\`\`

More content here to be ignored.
`;
      const result = await fileBlockParser(input, "", undefined, mockConfig);
      expect(result).toEqual([
        {
          path: "src/files/readJson.ts",
          content: "export function readJson() {}",
        },
        {
          path: "src/files/writeJson.ts",
          content: "export function writeJson() {}",
        },
      ]);
    });

    it("ignores incomplete code blocks missing closing backticks", async () => {
      const input = `
File path:src/files/readJson.ts
\`\`\`
file 1 contents
\`\`\`

File path:src/files/another.ts
\`\`\`
file 2 partial

File 2 should not be parsed since the closing triple backticks are missing.
    `;

      const result = await fileBlockParser(input, "", undefined, mockConfig);
      expect(result).toEqual([
        {
          path: "src/files/readJson.ts",
          content: "file 1 contents",
        },
        // No entry for src/files/another.ts because it's missing closing backticks
      ]);
    });
  });
});

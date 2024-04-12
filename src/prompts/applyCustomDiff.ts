import { promises as fs } from "fs";
import * as path from "path";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import {
  getEndReplaceLinesRegex,
  getEndUpdatesRegex,
  getStartReplaceLinesRegex,
  getStartUpdatesRegex,
} from "./markers.js";

type ContentLine = {
  type: "content";
  content: string;
};

type DeletedLine = {
  type: "deleted";
};

type ContentWithInsertionLine = {
  type: "contentWithInsertion";
  content: string;
  inserted: string;
};

type DeletedWithInsertionLine = {
  type: "deletedWithInsertion";
  inserted: string;
};

type FileLine =
  | ContentLine
  | DeletedLine
  | ContentWithInsertionLine
  | DeletedWithInsertionLine;

type DeleteLinesOperation = {
  type: "delete_lines";
  from: number;
  to: number;
};

type InsertLinesOperation = {
  type: "insert_lines";
  at: number;
  content: string[];
};

type Operation = DeleteLinesOperation | InsertLinesOperation;

export type SourceFile = { path: string; contents: string };

const parseUpdates = (
  updates: string,
  config: CodespinConfig
): { path: string; operations: Operation[] }[] => {
  const fileUpdates = updates
    .split(getEndUpdatesRegex(config))
    .filter((update) => update.trim())
    .map((update) => update.trim());

  return fileUpdates.map((update) => {
    const filePathMatch = update.match(getStartUpdatesRegex(config));
    const path = filePathMatch ? filePathMatch[1].trim() : "";

    const operations: Operation[] = [];
    let currentReplaceAt: number | null = null;
    let currentReplaceContent: string[] = [];
    let replaceLineCount: number = 0;

    const startReplaceRegex = getStartReplaceLinesRegex(config);
    const endReplaceRegex = getEndReplaceLinesRegex(config);

    const lines = update.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (startReplaceRegex.test(line)) {
        const [start, count] = line.split(":")[1].replace(/\$$/, "").split("-");
        currentReplaceAt = parseInt(start, 10);
        replaceLineCount = parseInt(count, 10);
      } else if (endReplaceRegex.test(line)) {
        if (currentReplaceAt !== null) {
          if (replaceLineCount > 0) {
            operations.push({
              type: "delete_lines",
              from: currentReplaceAt,
              to: currentReplaceAt + replaceLineCount - 1,
            });
          }

          if (currentReplaceContent.length > 0) {
            operations.push({
              type: "insert_lines",
              at: currentReplaceAt,
              content: currentReplaceContent,
            });
          }

          currentReplaceAt = null;
          currentReplaceContent = [];
          replaceLineCount = 0;
        }
      } else if (currentReplaceAt !== null) {
        currentReplaceContent.push(line);
      }
    }

    return { path, operations };
  });
};

export async function applyCustomDiff(
  updateString: string,
  workingDir: string,
  config: CodespinConfig
): Promise<SourceFile[]> {
  const updates = parseUpdates(updateString, config);

  return Promise.all(
    updates.map(async ({ path: filePath, operations }) => {
      const fileContent = await fs.readFile(
        path.resolve(workingDir, filePath),
        "utf-8"
      );

      const lines: FileLine[] = fileContent
        .split("\n")
        .map((content) => ({ type: "content", content }));

      // Extract just the delete operations for efficiency
      const deleteOperations = operations.filter(
        (op): op is DeleteLinesOperation => op.type === "delete_lines"
      );

      // Process deletions more directly
      const withDeletions: FileLine[] = lines.map((line, index) => {
        // Check if the current line index falls within any of the delete operations' ranges
        const isDeleted = deleteOperations.some(
          ({ from, to }) => index + 1 >= from && index + 1 <= to
        );
        return isDeleted ? { type: "deleted" } : line;
      });

      const insertOperations = operations.filter(
        (op): op is InsertLinesOperation => op.type === "insert_lines"
      );

      const withInsertions: FileLine[] = withDeletions.map((line, index) => {
        const insertOperation = insertOperations.find(
          (op) => op.at === index + 1
        );

        if (insertOperation) {
          const insertedContent = insertOperation.content.join("\n");
          switch (line.type) {
            case "deleted":
              return {
                type: "deletedWithInsertion",
                inserted: insertedContent,
              };
            case "content":
              return {
                type: "contentWithInsertion",
                content: line.content,
                inserted: insertedContent,
              };
            case "contentWithInsertion":
              return {
                type: "contentWithInsertion",
                content: line.content,
                inserted: `${line.inserted}\n${insertedContent}`,
              };
            case "deletedWithInsertion":
              return {
                type: "deletedWithInsertion",
                inserted: `${line.inserted}\n${insertedContent}`,
              };
            default:
              return line;
          }
        } else {
          return line; // No insertion for this line
        }
      });

      const finalContent = withInsertions
        .map((line) => {
          switch (line.type) {
            case "content":
              return line.content;
            case "deletedWithInsertion":
              return line.inserted;
            case "contentWithInsertion":
              return `${line.content}\n${line.inserted}`;
            case "deleted":
              return null;
            default:
              return null;
          }
        })
        .filter((x) => x !== null)
        .join("\n");

      return { path: filePath, contents: finalContent };
    })
  );
}

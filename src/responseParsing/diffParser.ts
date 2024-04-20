import { promises as fs } from "fs";
import * as path from "path";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import {
  getDeleteLinesRegex,
  getEndInsertLinesRegex,
  getEndUpdatesRegex,
  getStartInsertLinesRegex,
  getStartUpdatesRegex,
} from "../responseParsing/markers.js";
import { isDefined } from "../langTools/isDefined.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

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
  after: number;
  content: string[];
};

type Operation = DeleteLinesOperation | InsertLinesOperation;

const parseUpdates = (
  updates: string,
  config: CodespinConfig
): { path: string; operations: Operation[] }[] => {
  const fileUpdates = updates
    .split(getEndUpdatesRegex(config))
    .filter((update) => update.trim())
    .map((update) => update.trim());

  const operations = fileUpdates.map((update) => {
    const filePathMatch = update.match(getStartUpdatesRegex(config));

    if (filePathMatch) {
      const path = filePathMatch ? filePathMatch[1].trim() : "";

      const operations: Operation[] = [];
      const lines = update.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const deleteMatch = line.match(getDeleteLinesRegex(config));
        if (deleteMatch) {
          const from = parseInt(deleteMatch[1], 10);
          const to = parseInt(deleteMatch[2], 10);
          operations.push({ type: "delete_lines", from, to });
        }

        const insertMatch = line.match(getStartInsertLinesRegex(config));
        if (insertMatch) {
          const after = parseInt(insertMatch[1], 10);
          const content: string[] = [];
          i++;
          while (
            i < lines.length &&
            !getEndInsertLinesRegex(config).test(lines[i])
          ) {
            content.push(lines[i]);
            i++;
          }
          operations.push({ type: "insert_lines", after, content });
        }
      }

      return { path, operations };
    }
  });

  return operations.filter(isDefined);
};

export async function diffParser(
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
          (op) => op.after === index + 1
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

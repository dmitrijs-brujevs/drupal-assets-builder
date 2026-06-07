import assert from "node:assert/strict";
import test from "node:test";
import { parseArguments } from "../../src/cli.js";

test("parses portable CLI options", () => {
  assert.deepEqual(
    parseArguments([
      "build",
      "--root",
      "/tmp/project",
      "--web-root",
      "docroot",
      "--verbose",
    ]),
    {
      command: "build",
      options: { root: "/tmp/project", webRoot: "docroot", verbose: true },
    },
  );
});

test("rejects unknown options", () => {
  assert.throws(() => parseArguments(["build", "--wat"]), /Unknown option/);
});

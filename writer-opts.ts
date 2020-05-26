import compareFunc from "compare-func";
import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { cwd } from "process";
import { all, denodeify } from "q";
const readFile = denodeify(require("fs").readFile);

interface IScope {
  [key: string]: string;
}

interface IConfiguration {
  scopes: Array<IScope>;
}

export interface IWriterOptions {
  commitGroupsSort: string;
  commitPartial?: string;
  commitsSort: string[];
  footerPartial?: string;
  headerPartial?: string;
  groupBy: string;
  mainTemplate?: string;
  noteGroupsSort: string;
  notesSort: Function;
  transform: Function;
}

export const writerOpts = all([
  readFile(resolve(__dirname, "templates", "template.hbs"), "utf-8"),
  readFile(resolve(__dirname, "templates", "header.hbs"), "utf-8"),
  readFile(resolve(__dirname, "templates", "commit.hbs"), "utf-8"),
  readFile(resolve(__dirname, "templates", "footer.hbs"), "utf-8"),
]).spread((template, header, commit, footer) => {
  const writerOpts = getWriterOpts();

  writerOpts.mainTemplate = template;
  writerOpts.headerPartial = header;
  writerOpts.commitPartial = commit;
  writerOpts.footerPartial = footer;

  return writerOpts;
});

function getWriterOpts(): IWriterOptions {
  return {
    transform: (commit, context) => {
      let discard = true;
      const issues: string[] = [];
      commit.notes.forEach((note) => {
        note.title = "BREAKING CHANGES";
        discard = false;
      });

      if (commit.type === "feat") {
        commit.type = "Features";
      } else if (commit.type === "improvement") {
        commit.type = "Improvements";
      } else if (commit.type === "fix") {
        commit.type = "Bug fixes";
      } else if (commit.type === "perf") {
        commit.type = "Performance Improvements";
      } else if (commit.type === "revert") {
        commit.type = "Reverts";
      } else if (commit.type === "docs") {
        commit.type = "Documentation";
      } else if (commit.type === "chore" && commit.scope === "deps") {
        commit.type = "Dependencies";
        commit.scope = "";
      } else if (discard) {
        return;
      } else if (commit.type === "style") {
        commit.type = "Styles";
      } else if (commit.type === "refactor") {
        commit.type = "Code Refactoring";
      } else if (commit.type === "test") {
        commit.type = "Tests";
      } else if (commit.type === "build") {
        commit.type = "Build System";
      } else if (commit.type === "ci") {
        commit.type = "Continuous Integration";
      }

      if (!commit.scope || commit.scope === "*") {
        commit.scope = "";
      }

      let configPath = join(cwd(), ".conventional-changelog");

      if (existsSync(configPath)) {
        const config = JSON.parse(
          readFileSync(configPath, { encoding: "utf-8" })
        ) as IConfiguration;
        if (config.scopes) {
          for (const key in config.scopes) {
            if (!config.scopes.hasOwnProperty(key)) {
              continue;
            }

            if (key === commit.scope) {
              commit.scope = config.scopes[key];
            }
          }
        }
      }

      if (typeof commit.hash === "string") {
        commit.hash = commit.hash.substring(0, 7);
      }

      if (typeof commit.subject === "string") {
        let url = context.repository
          ? `${context.host}/${context.owner}/${context.repository}`
          : context.repoUrl;
        if (url) {
          url = `${url}/issues/`;
          commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
            issues.push(issue);
            return `[#${issue}](${url}/${issue})`;
          });
        }

        if (context.host) {
          // User URLs.
          commit.subject = commit.subject.replace(
            /\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g,
            (_, username) => {
              if (username.includes("/")) {
                return `@${username}`;
              }

              return `[@${username}](${context.host}/${username}))`;
            }
          );
        }
      }

      // remove references that already appear in the subject
      commit.references = commit.references.filter((reference) => {
        if (issues.indexOf(reference.issue) === -1) {
          return true;
        }

        return false;
      });

      return commit;
    },
    groupBy: "type",
    commitGroupsSort: "title",
    commitsSort: ["scope", "subject"],
    noteGroupsSort: "title",
    notesSort: compareFunc,
  };
}

import compareFunc from "compare-func";
import { all, denodeify } from "q";
const readFile = denodeify(require("fs").readFile);
import { resolve } from "path";

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
  transform: (commit: any, context: any) => void | any;
}

export const writerOpts = all([
  readFile(resolve(__dirname, "template", "template.hbs"), "utf-8"),
  readFile(resolve(__dirname, "template", "header.hbs"), "utf-8"),
  readFile(resolve(__dirname, "template", "commit.hbs"), "utf-8"),
  readFile(resolve(__dirname, "template", "footer.hbs"), "utf-8")
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
      commit.notes.forEach(note => {
        note.title = "BREAKING CHANGES";
        discard = false;
      });

      if (commit.type === "feat") {
        commit.type = "Features";
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
      } else if ((commit.type = "ci")) {
        commit.type = "Continuous Integration";
      }

      if (commit.scope === "*") {
        commit.scope = "";
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

              return `[@${username}](${context.host}/${username})`;
            }
          );
        }
      }

      // remove references that already appear in the subject
      commit.references = commit.references.filter(reference => {
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
    notesSort: compareFunc
  };
}

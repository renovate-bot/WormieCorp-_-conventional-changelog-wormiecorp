import { all } from "q";
import { conventialChangelog } from "./conventional-changelog";
import { parserOpts } from "./parser-opts";
import { recommendedBumpOpts } from "./conventional-recommended-bump";
import { writerOpts } from "./writer-opts";

export = all([
  conventialChangelog,
  parserOpts,
  recommendedBumpOpts,
  writerOpts
]).spread(
  (conventialChangelog, parserOpts, recommendedBumpOpts, writerOpts) => {
    return { conventialChangelog, parserOpts, recommendedBumpOpts, writerOpts };
  }
);

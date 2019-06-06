import { all } from "q";
import { parserOpts } from "./parser-opts";
import { writerOpts, IWriterOptions } from "./writer-opts";

export const conventialChangelog = all([parserOpts, writerOpts]).spread(
  (parserOpts, writerOpts: IWriterOptions) => {
    return { parserOpts, writerOpts };
  }
);

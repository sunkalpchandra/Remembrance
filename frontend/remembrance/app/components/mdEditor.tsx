"use client";

import { MDXEditor, MDXEditorMethods, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin } from "@mdxeditor/editor";
import { FC } from "react";

interface EditorProps {
  markdown: string;
  editorRef?: React.MutableRefObject<MDXEditorMethods | null>;
  change: (e : string) => void
}

/**
 * Extend this Component further with the necessary plugins or props you need.
 * proxying the ref is necessary. Next.js dynamically imported components don't support refs.
 */
const Editor: FC<EditorProps> = ({ markdown, editorRef , change}) => {
  return (
    <MDXEditor className = "w-[80%] h-full"
      onChange={change}
      ref={editorRef}
      markdown={markdown}
      plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin()]}
      trim = {false}
    />
  );
};

export default Editor;
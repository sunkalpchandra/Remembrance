import React from "react";
import { useDropzone } from "react-dropzone";

interface DropZoneProps {
  onDrop?: (acceptedFiles: File[]) => void;
}

export default function DropzoneWithoutClick(props: DropZoneProps) {
  const { getRootProps, acceptedFiles } = useDropzone({
    onDrop: props.onDrop,
  });
  const files = acceptedFiles.map((file) => (
    <li key={file.name || file.path}>{file.name || file.path}</li>
  ));

  return (
    <section className="container">
      <div {...getRootProps({ className: "dropzone" })}>
        <p>Dropzone without click events</p>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
      </aside>
    </section>
  );
}

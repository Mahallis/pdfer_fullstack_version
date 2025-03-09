import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

export default function OrganizeForm ({fileUrl}) {

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const [file, setFile] = useState()
  const [numPages, setNumPages] = useState();
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  return (
    <div>
      <div className="floating-group input-group-lg">
        <label htmlFor="formFileMultiple" className="form-label">
          Загрузите один или несколько PDF файлов
        </label>
        <input
          className="form-control"
          id="file"
          name="files"
          type="file"
          onChange={(event) => setFile(() => event.target.files[0])}
          required
        />
      </div>
      <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={pageNumber} />
      </Document>
      <p>
        Page {pageNumber} of {numPages}
      </p>
    </div>
  );
}

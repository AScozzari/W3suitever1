import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

console.log('PDF.js import:', typeof pdfjsLib.getDocument);
console.log('Keys:', Object.keys(pdfjsLib).slice(0, 5));

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function downloadElementAsPdf(elementId: string, filename: string, format: "label" | "a4") {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Document not found");

  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf =
    format === "label"
      ? new jsPDF({ orientation: "portrait", unit: "in", format: [4, 6] })
      : new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
  pdf.save(filename);
}

export function printDocument() {
  window.print();
}

export type CertificatePayload = {
  userName: string;
  courseName: string;
  certificateId: string;
  completionDate: string;
  score?: number;
  organizationName?: string;
};

export async function downloadCertificatePDF(payload: CertificatePayload) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(4);
  doc.rect(28, 28, w - 56, h - 56);
  doc.setLineWidth(1);
  doc.setDrawColor(120);
  doc.rect(42, 42, w - 84, h - 84);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("Certificate of Completion", w / 2, 120, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text("This certifies that", w / 2, 170, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(payload.userName || "Crew Member", w / 2, 215, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text("has successfully completed", w / 2, 255, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(payload.courseName, w / 2, 295, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  const lines = [
    payload.organizationName ? `Organization: ${payload.organizationName}` : "",
    typeof payload.score === "number" ? `Score: ${payload.score}%` : "",
    `Completed: ${payload.completionDate}`,
  ].filter(Boolean) as string[];

  let y = 340;
  for (const line of lines) {
    doc.text(line, w / 2, y, { align: "center" });
    y += 22;
  }

  doc.setFontSize(12);
  doc.text(`Certificate ID: ${payload.certificateId}`, 70, h - 80);
  doc.text("Work Zone OS Training", w - 70, h - 80, { align: "right" });

  doc.save(`certificate-${payload.certificateId}.pdf`);
}

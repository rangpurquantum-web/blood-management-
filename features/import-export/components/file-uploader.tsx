"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { UploadCloud, File, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

import { importDonorSchema, type DonorInput } from "@/features/donors/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Matches exactly what parseCSV below expects (header names only — no example row)
const TEMPLATE_HEADERS = ["fullName", "dob", "gender", "bloodType", "phone", "email", "address"];

function downloadCsvTemplate() {
  const csvContent = Papa.unparse({
    fields: TEMPLATE_HEADERS,
    data: [],
  });

  // Prefix with a UTF-8 BOM so Excel opens Bangla text correctly if present
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "donor_import_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<DonorInput[]>([]);
  const [errors, setErrors] = useState<{ row: number; error: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const rawData = results.data as any[];

        // Debug: প্রথম row এবং তার keys দেখতে চাইলে কমেন্ট খুলুন
        // console.log("First parsed row:", rawData[0]);
        // console.log("Keys:", rawData[0] ? Object.keys(rawData[0]) : []);

        const validDonors: DonorInput[] = [];
        const parsingErrors: { row: number; error: string }[] = [];

        rawData.forEach((row, index) => {
          const mappedRow = {
            fullName: row.fullname || row.name || "",
            dob: row.dob || row.dateofbirth || "2000-01-01",
            gender: row.gender || "",
            bloodType: row.bloodtype || row.bloodgroup || "",
            phone: [
              {
                number: String(row.phone || row.phonenumber || "").trim().replace(/\s+/g, ""),
                label: "Primary",
                isPrimary: true,
              },
            ],
            email: row.email || "",
            address: row.address || "",
          };

          const validation = importDonorSchema.safeParse(mappedRow);

          if (validation.success) {
            validDonors.push(validation.data as DonorInput);
          } else {
            parsingErrors.push({
              row: index + 2, // +2 because 0-indexed and header row
              error: validation.error.errors.map((e) => e.message).join(", "),
            });
          }
        });

        setParsedData(validDonors);
        setErrors(parsingErrors);
      },
    });
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    setIsUploading(true);

    try {
      const res = await fetch("/api/donors/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donors: parsedData }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to import");
      }

      toast.success(`Successfully imported ${json.count} donors!`);
      setFile(null);
      setParsedData([]);
      setErrors([]);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during import");
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
  };

  return (
    <Card className="w-full shadow-sm bg-card/60 backdrop-blur-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Upload Donor List</CardTitle>
          <CardDescription>
            Drag and drop a CSV file containing donor records. Ensure headers match: fullName, dob, gender, bloodType, phone, email, address.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadCsvTemplate}
          className="shrink-0 whitespace-nowrap w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
              ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className={`mx-auto h-12 w-12 mb-4 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-lg font-medium">
              {isDragActive ? "Drop the CSV file here..." : "Drag & drop a CSV file"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              or click to browse from your computer
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <File className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Remove
              </Button>
            </div>

            {errors.length > 0 && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <h4 className="font-semibold text-sm">Validation Errors Found</h4>
                </div>
                <p className="text-xs text-destructive/80 mb-3">
                  {errors.length} rows contain invalid data and will be skipped.
                </p>
                <div className="max-h-[150px] overflow-y-auto space-y-1 text-xs">
                  {errors.map((err, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="font-mono text-destructive/60">Row {err.row}:</span>
                      <span>{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsedData.length > 0 && (
              <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-emerald-700 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <h4 className="font-semibold text-sm">Ready to Import</h4>
                </div>
                <p className="text-sm text-emerald-700/80">
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 mr-2">
                    {parsedData.length} Valid Records
                  </Badge>
                  These donors passed validation and are ready to be saved.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {file && (
        <CardFooter className="flex justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={clearSelection} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={parsedData.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${parsedData.length} Donors`
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

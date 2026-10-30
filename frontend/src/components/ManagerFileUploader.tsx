/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Upload, FileSpreadsheet, Calendar, Trash2, CheckCircle, Info, AlertTriangle, Eye, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiUpload, apiGet, apiDelete } from "../api";
import { Company } from "../types";

interface HistoryEntry {
  id: number;
  file_name: string;
  uploaded_at: string;
  row_count: number;
  status: string;
  users?: { name: string; email: string } | null;
}

interface DatasetDetail extends HistoryEntry {
  raw_data?: Record<string, unknown>[] | null;
}

interface UploadResultBanner {
  fileName: string;
  totalRows: number;
  imported: number;
  failed: { row: Record<string, unknown>; reason: string }[];
  newProductsCreated: string[];
  newCategoriesCreated: string[];
  errorMessage?: string;
}

interface ManagerFileUploaderProps {
  company: Company;
  onDataChanged?: () => void;
}

export default function ManagerFileUploader({ company, onDataChanged }: ManagerFileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filterType, setFilterType] = useState<"ALL" | "DAY" | "WEEK" | "MONTH" | "YEAR">("ALL");
  const [selectedDataset, setSelectedDataset] = useState<DatasetDetail | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState<UploadResultBanner | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await apiGet(`/upload/history?companyId=${company.id}`);
      setHistory(data);
    } catch (e) {
      console.error("Failed to load upload history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setLastResult(null);
    try {
      const result = await apiUpload("/upload/sales", file, { companyId: Number(company.id) });
      setLastResult({
        fileName: file.name,
        totalRows: result.totalRows ?? 0,
        imported: result.salesCreated ?? result.imported ?? 0,
        failed: result.failed ?? [],
        newProductsCreated: result.newProductsCreated ?? [],
        newCategoriesCreated: result.newCategoriesCreated ?? [],
      });
      await loadHistory();
    } catch (err: any) {
      setLastResult({
        fileName: file.name,
        totalRows: 0,
        imported: 0,
        failed: [],
        newProductsCreated: [],
        newCategoriesCreated: [],
        errorMessage: err?.message ?? "Upload failed",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleViewDataset = async (id: number) => {
    try {
      const detail = await apiGet(`/upload/${id}`);
      setSelectedDataset(detail);
    } catch (e) {
      console.error("Failed to load dataset detail:", e);
    }
  };

  const handleDeleteDataset = async (id: number) => {
    setIsDeleting(true);
    try {
      await apiDelete(`/upload/${id}`);
      setConfirmDeleteId(null);
      await loadHistory();
      onDataChanged?.();
    } catch (e) {
      console.error("Failed to delete dataset:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    if (filterType === "ALL") return true;
    const fileDate = new Date(item.uploaded_at);
    const now = new Date();
    if (filterType === "DAY") {
      return fileDate.getDate() === now.getDate() && fileDate.getMonth() === now.getMonth() && fileDate.getFullYear() === now.getFullYear();
    }
    if (filterType === "WEEK") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return fileDate >= sevenDaysAgo;
    }
    if (filterType === "MONTH") {
      return fileDate.getMonth() === now.getMonth() && fileDate.getFullYear() === now.getFullYear();
    }
    if (filterType === "YEAR") {
      return fileDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const previewColumns = selectedDataset?.raw_data && selectedDataset.raw_data.length > 0 ? Object.keys(selectedDataset.raw_data[0]) : [];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div>
        <h3 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#261CC1]" />
          Bulk Sales Import — {company.name}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Upload a CSV or XLSX file of sales transactions to import them directly into the live database for this company.
        </p>
      </div>

      {/* Drag & Drop File Upload Field */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive ? "border-[#261CC1] bg-indigo-50/20" : "border-slate-200 hover:border-[#261CC1] bg-slate-50/50"
        }`}
      >
        <input
          type="file"
          id="csv-file-input"
          accept=".csv, .xlsx, .xls"
          onChange={handleFileChange}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#5EABD6]/15 text-[#5EABD6] flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-800">
            {isUploading ? "Uploading and importing..." : (
              <>Drag and drop your spreadsheet here, or <span className="text-[#E14434] hover:underline cursor-pointer">browse files</span></>
            )}
          </p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase">
            Flexible columns accepted (product, category, quantity, price/total, date, transaction id...)
          </p>
        </div>
      </div>

      {/* Result banner from the most recent upload */}
      {lastResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-2 ${lastResult.errorMessage ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
          {lastResult.errorMessage ? (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            {lastResult.errorMessage ? (
              <p className="text-red-800 font-semibold">{lastResult.fileName}: {lastResult.errorMessage}</p>
            ) : (
              <>
                <p className="text-emerald-800 font-bold">
                  {lastResult.fileName}: {lastResult.imported} sale(s) imported from {lastResult.totalRows} row(s)
                  {lastResult.failed.length > 0 ? `, ${lastResult.failed.length} skipped` : ""}.
                </p>
                {(lastResult.newProductsCreated.length > 0 || lastResult.newCategoriesCreated.length > 0) && (
                  <p className="text-emerald-700 mt-1">
                    New: {lastResult.newProductsCreated.length} product(s), {lastResult.newCategoriesCreated.length} categor{lastResult.newCategoriesCreated.length === 1 ? "y" : "ies"} auto-created.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Uploaded History logs header with filter controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-slate-100">
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              Feed Submission History
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold">Updates and syncs automatically — click any entry to view its parsed contents (read-only)</p>
          </div>
          <div className="flex flex-wrap gap-1 bg-slate-100 p-0.5 rounded-lg">
            {(["ALL", "DAY", "WEEK", "MONTH", "YEAR"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 text-[9px] font-bold rounded-md uppercase transition-all cursor-pointer ${
                  filterType === t ? "bg-white text-[#E14434] shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t === "ALL" ? "All" : t === "DAY" ? "Day" : t === "WEEK" ? "Week" : t === "MONTH" ? "Month" : "Year"}
              </button>
            ))}
          </div>
        </div>

        {isLoadingHistory ? (
          <div className="text-center py-8 text-slate-400 text-xs font-semibold">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-semibold">
            No matching upload entries found for selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto pr-1">
            {filteredHistory.map((item) =>
              confirmDeleteId === item.id ? (
                <div key={item.id} className="py-3 px-2 rounded-xl bg-red-50/60 border border-red-100 flex items-center justify-between gap-3 my-1">
                  <p className="text-[11px] font-bold text-red-800">
                    Delete "{item.file_name}"? This removes the {item.row_count} row(s) of sales it created too.
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={isDeleting}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDataset(item.id)}
                      disabled={isDeleting}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 px-2.5"
                      title="Confirm delete"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{isDeleting ? "Deleting..." : "Delete"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={item.id}
                  onClick={() => handleViewDataset(item.id)}
                  className="py-3 px-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#5EABD6]/10 text-[#5EABD6] flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-[#5EABD6]">{item.file_name}</p>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">
                        #{item.id} • {item.row_count} rows • {new Date(item.uploaded_at).toLocaleString()} {item.users ? `• ${item.users.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      item.status === "processed" ? "bg-emerald-50 text-emerald-700" : item.status === "failed" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {item.status}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleViewDataset(item.id); }}
                      title="View file contents"
                      className="p-1.5 bg-[#5EABD6]/10 hover:bg-[#5EABD6]/20 text-[#5EABD6] rounded-lg transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                      title="Delete this upload"
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Dataset Contents Viewer (read-only) */}
      <AnimatePresence>
        {selectedDataset && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-3xl w-full border border-slate-200"
            >
              <div className="flex justify-between items-start border-b pb-4 border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-50 text-[#261CC1] rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{selectedDataset.file_name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">#{selectedDataset.id} • Read-only file contents</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDataset(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Status</p>
                    <p className="font-extrabold text-slate-800 mt-0.5 capitalize">{selectedDataset.status}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Row Count</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">{selectedDataset.row_count}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Uploaded</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">{new Date(selectedDataset.uploaded_at).toLocaleString()}</p>
                  </div>
                </div>

                {selectedDataset.raw_data && selectedDataset.raw_data.length > 0 ? (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 mt-1">
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase mb-2 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#261CC1]" />
                      Parsed File Contents (view only)
                    </p>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white max-h-72">
                      <table className="w-full text-left text-[11px] divide-y divide-slate-100 table-auto">
                        <thead className="bg-slate-50/50 text-slate-500 font-mono font-bold uppercase sticky top-0">
                          <tr>
                            {previewColumns.map((col) => (
                              <th key={col} className="px-3.5 py-2.5 text-[9px] font-mono border-b bg-slate-50 text-slate-500 uppercase whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                          {selectedDataset.raw_data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/30">
                              {previewColumns.map((col) => (
                                <td key={col} className="px-3.5 py-2 text-[10px] whitespace-nowrap">{String(row[col] ?? "-")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center text-slate-400 font-semibold">
                    No stored row preview for this dataset.
                  </div>
                )}

                <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50 flex gap-2">
                  <Info className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-indigo-800 font-semibold leading-relaxed">
                    This is a read-only view of the originally uploaded file. Editing here is disabled — this is a permanent audit record.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedDataset(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

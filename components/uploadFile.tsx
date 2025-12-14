"use client";

import React, { useState, DragEvent, ChangeEvent } from "react";
import { Upload, FileJson } from "lucide-react";
import * as XLSX from "xlsx";

interface UploadFileProps {
  onFileSelect: (file: File) => void;
  onJsonConvert?: (json: Record<string, unknown>[]) => void; // Callback pour envoyer le JSON au parent
}

const UploadFile: React.FC<UploadFileProps> = ({
  onFileSelect,
  onJsonConvert,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Quand on choisit via input
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
      onFileSelect(selectedFile);
    }
  };

  // Drag enter / over
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  // Drag leave
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  // Drop
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setFileName(droppedFile.name);
      onFileSelect(droppedFile);
    }
  };

  // Convertir en JSON
  const handleConvertToJson = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0]; // première feuille
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);
      console.log("JSON généré :", json);

      if (onJsonConvert) {
        onJsonConvert(json as Record<string, unknown>[]);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Zone Upload */}
      <div
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition 
          ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-gray-100"
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="fileInput"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <label htmlFor="fileInput" className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-blue-500" />
          <span className="text-sm text-gray-600">
            {fileName
              ? `Fichier sélectionné : ${fileName}`
              : "Cliquez ou glissez-déposez un fichier Excel"}
          </span>
        </label>
      </div>

      {/* Bouton Convertir en JSON */}
      {file && (
        <button
          onClick={handleConvertToJson}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
        >
          <FileJson className="w-5 h-5" />
          Convertir en JSON
        </button>
      )}
    </div>
  );
};

export default UploadFile;

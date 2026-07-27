import multer from "multer";

const allowedMimeTypes = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);

const storage = multer.memoryStorage();

export const excelUpload = multer({
  storage,

  limits: {
    fileSize: 20 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const filename = file.originalname.toLowerCase();

    const hasValidExtension =
      filename.endsWith(".xlsx") || filename.endsWith(".xls");

    const hasValidMimeType = allowedMimeTypes.has(file.mimetype);

    if (!hasValidExtension && !hasValidMimeType) {
      return callback(new Error("Only XLSX and XLS Excel files are allowed."));
    }

    callback(null, true);
  },
});

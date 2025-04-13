import multer from "multer";

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB por arquivo
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
});

export default upload;

import { File } from "buffer";
import exp from "constants";
import multer from "multer";
import path from "path";
import { process } from "process";

const storage = multer.diskStorage({
  destination: function (req, res, callBack) {
    const uploadPath = path.join(cwd(), "public", "temp");
    callBack(null, uploadPath);
  },
  filename: function (req, res, callBack) {
    const uniqueName = Date.now() + "-" + Math.floor(Math.random() * 1e9);
    callBack(null, `${uniqueName}-${res.originalname}`);
  },
});

export const uplaod = multer({ storage: storage });

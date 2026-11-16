import { Router, type IRouter } from "express";
import healthRouter from "./health";
import saveRouter from "./save";
import blueprintRouter from "./blueprint";

const router: IRouter = Router();

router.use(healthRouter);
router.use(saveRouter);
router.use(blueprintRouter);

export default router;

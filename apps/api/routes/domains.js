import {Router} from "express";
import {DomainController} from "../controllers/domains.js";
import {authMiddleware} from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/user/:userid", DomainController.getByUserId);
router.get("/:id/status", DomainController.getDomainStatus);
router.post("/", DomainController.create);
router.post("/:id/verify", DomainController.verifyDomain);
router.delete("/:id", DomainController.delete);

export {router as domainsRouter};
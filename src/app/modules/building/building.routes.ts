import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { BuildingController } from './building.controller';
import { BuildingValidations } from './building.validation';

const router = express.Router();

router.get('/', BuildingController.getAllFromDB);
router.post(
  '/',
  validateRequest(BuildingValidations.create),
  BuildingController.insertIntoDB
);

export const buildingRoutes = router;

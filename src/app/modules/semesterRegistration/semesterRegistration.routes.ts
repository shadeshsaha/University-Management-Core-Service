import express from 'express';
import { SemesterRegistrationController } from './semesterRegistration.controller';

const router = express.Router();

router.get('/', SemesterRegistrationController.getAllFromDB);
router.get('/:id', SemesterRegistrationController.getByIdFromDB);

router.post('/', SemesterRegistrationController.insertIntoDB);

router.delete('/:id', SemesterRegistrationController.deleteByIdFromDB);

export const semesterRegistrationRoutes = router;

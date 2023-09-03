import express from 'express';
import { AcademicSemesterController } from './academicSemster.controller';

const router = express.Router();

router.post('/', AcademicSemesterController.insertIntoDB);

export const AcademicSemesterRoutes = router;
